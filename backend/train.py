"""
Train a MobileNetV2 plant classifier on custom UK plant images
and export to TFLite for on-device inference.

Usage:
  python train.py --data_dir ./plant_images --epochs 20 --output model.tflite

Directory structure expected:
  plant_images/
    tomato/
      img1.jpg ...
    rose/
      img1.jpg ...
    ...
"""

import argparse
import os
import json
import pathlib

import numpy as np

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

parser = argparse.ArgumentParser(description="Train MobileNetV2 plant classifier → TFLite")
parser.add_argument("--data_dir",  default="plant_images",  help="Root folder with class sub-dirs")
parser.add_argument("--epochs",    type=int, default=15,    help="Fine-tuning epochs")
parser.add_argument("--img_size",  type=int, default=224,   help="Input image size")
parser.add_argument("--batch",     type=int, default=32,    help="Batch size")
parser.add_argument("--output",    default="alloti_plants.tflite", help="Output .tflite path")
parser.add_argument("--labels",    default="labels.json",   help="Output labels JSON path")
parser.add_argument("--val_split", type=float, default=0.2, help="Validation split ratio")
args = parser.parse_args()

IMG_SIZE  = (args.img_size, args.img_size)
DATA_DIR  = pathlib.Path(args.data_dir)

# ---------------------------------------------------------------------------
# Lazy TF import (allows importing this file without TF installed)
# ---------------------------------------------------------------------------

try:
    import tensorflow as tf
    from tensorflow import keras
    TF_AVAILABLE = True
    print(f"TensorFlow {tf.__version__} detected")
except ImportError:
    TF_AVAILABLE = False
    print("TensorFlow not installed. Install with: pip install tensorflow")
    raise SystemExit(1)

# ---------------------------------------------------------------------------
# Data pipeline
# ---------------------------------------------------------------------------

def build_datasets():
    train_ds = keras.utils.image_dataset_from_directory(
        DATA_DIR,
        validation_split=args.val_split,
        subset="training",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=args.batch,
        label_mode="int",
    )
    val_ds = keras.utils.image_dataset_from_directory(
        DATA_DIR,
        validation_split=args.val_split,
        subset="validation",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=args.batch,
        label_mode="int",
    )
    class_names = train_ds.class_names
    num_classes = len(class_names)
    print(f"Classes ({num_classes}): {class_names}")

    preprocess = keras.applications.mobilenet_v2.preprocess_input

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = (
        train_ds
        .map(lambda x, y: (preprocess(x), y), num_parallel_calls=AUTOTUNE)
        .cache()
        .shuffle(1000)
        .prefetch(AUTOTUNE)
    )
    val_ds = (
        val_ds
        .map(lambda x, y: (preprocess(x), y), num_parallel_calls=AUTOTUNE)
        .cache()
        .prefetch(AUTOTUNE)
    )
    return train_ds, val_ds, class_names, num_classes


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def build_model(num_classes: int) -> keras.Model:
    base = keras.applications.MobileNetV2(
        input_shape=(*IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False  # Freeze backbone for initial training

    inputs = keras.Input(shape=(*IMG_SIZE, 3))
    x = base(inputs, training=False)
    x = keras.layers.GlobalAveragePooling2D()(x)
    x = keras.layers.Dropout(0.3)(x)
    x = keras.layers.Dense(128, activation="relu")(x)
    x = keras.layers.Dropout(0.2)(x)
    outputs = keras.layers.Dense(num_classes, activation="softmax")(x)

    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model, base


def unfreeze_and_finetune(model: keras.Model, base: keras.Model, train_ds, val_ds):
    """Unfreeze top layers of MobileNetV2 for fine-tuning."""
    base.trainable = True
    fine_tune_at = 100  # Freeze all layers before this index

    for layer in base.layers[:fine_tune_at]:
        layer.trainable = False

    model.compile(
        optimizer=keras.optimizers.Adam(1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=5,
        callbacks=[
            keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
        ],
    )
    return model


# ---------------------------------------------------------------------------
# TFLite export
# ---------------------------------------------------------------------------

def export_tflite(model: keras.Model, output_path: str):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    tflite_model = converter.convert()

    with open(output_path, "wb") as f:
        f.write(tflite_model)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"TFLite model saved: {output_path}  ({size_mb:.1f} MB)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not DATA_DIR.exists():
        print(f"Data directory '{DATA_DIR}' not found.")
        print("Create it with sub-folders named after each plant species.")
        raise SystemExit(1)

    train_ds, val_ds, class_names, num_classes = build_datasets()

    # Save labels
    with open(args.labels, "w") as f:
        json.dump(class_names, f, indent=2)
    print(f"Labels saved to {args.labels}")

    # Phase 1 — train head only
    print("\n=== Phase 1: Training classification head ===")
    model, base = build_model(num_classes)
    model.summary(line_length=80)

    callbacks = [
        keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(patience=3, factor=0.5),
        keras.callbacks.ModelCheckpoint("best_model.keras", save_best_only=True),
    ]
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    # Phase 2 — fine-tune backbone
    print("\n=== Phase 2: Fine-tuning MobileNetV2 backbone ===")
    model = unfreeze_and_finetune(model, base, train_ds, val_ds)

    # Evaluate
    loss, acc = model.evaluate(val_ds)
    print(f"\nFinal validation accuracy: {acc:.3f}  loss: {loss:.3f}")

    # Export
    export_tflite(model, args.output)
    print("\nDone. Deploy alloti_plants.tflite to Expo app assets/.")


if __name__ == "__main__":
    main()
