use std::collections::HashMap;

use js_sys::{Array, Number};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::array_utils::{
    get_shape_3d_array, rotate_x_3d_array, rotate_y_3d_array, rotate_z_3d_array, trim_3d_array,
};
#[cfg(feature = "convert")]
use crate::image_convert::ColorFlatConvertImageOptions;

#[cfg(feature = "convert")]
use {
    crate::array_utils::count_not_null_3d_array,
    crate::image_convert::{
        compute_color_preview, compute_grayscale_preview, convert_image_color_flat,
        convert_image_grayscale, open_image, GrayscaleConvertImageOptions,
    },
    crate::voxelization::voxelize,
    std::io::Cursor,
};

mod array_utils;
mod build_compression;
mod color_data;
#[cfg(feature = "convert")]
mod image_convert;
#[cfg(feature = "convert")]
mod voxelization;

extern crate console_error_panic_hook;
use console_error_panic_hook::set_once as set_panic_hook;
#[wasm_bindgen(start)]
pub fn start() -> Result<(), JsValue> {
    set_panic_hook();
    Ok(())
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct GrayImageMetadata {
    pub preview: String,
}

#[wasm_bindgen(typescript_custom_section)]
const BlockCountMap: &'static str = r#"
export type BlockCountMap = Map<string,number>
"#;

#[wasm_bindgen]
extern "C" {
    #[derive(Clone)]
    #[wasm_bindgen(typescript_type = "BlockCountMap")]
    pub type BlockCountMap;
}
#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ColorImageMetadata {
    pub preview: String,
    // #[wasm_bindgen(skip)]
    individual_block_count: HashMap<String, usize>,
}

#[wasm_bindgen(js_class = ColorImageMetadata)]
impl ColorImageMetadata {
    #[wasm_bindgen(getter)]
    pub fn individual_block_count(&self) -> BlockCountMap {
        serde_wasm_bindgen::to_value(&self.individual_block_count)
            .unwrap()
            .into()
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct ModelMetadata {}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum BuildType {
    GrayImage(GrayImageMetadata),
    ColorImage(ColorImageMetadata),
    Model(ModelMetadata),
}

#[derive(Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct BuildMetadata {
    pub r#type: BuildType,
    pub width: usize,
    pub depth: usize,
    pub height: usize,
    pub block_count: u32,
}

#[wasm_bindgen(getter_with_clone)]
pub struct Build {
    pub metadata: BuildMetadata,
    shape: Vec<Vec<Vec<u8>>>,
    palette: Vec<String>,
}

#[derive(Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct CompressedBuild {
    pub metadata: BuildMetadata,
    pub data: String,
    palette: Vec<String>,
}

pub fn js_err(msg: &str) -> JsValue {
    js_sys::Error::new(msg).into()
}

#[wasm_bindgen(js_class = Build)]
impl Build {
    pub fn get_shape(&self) -> Array<Array<Array<Number>>> {
        Array::from_iter_typed(self.shape.iter().map(|layer| {
            Array::from_iter_typed(
                layer
                    .iter()
                    .map(|row| Array::from_iter_typed(row.iter().copied().map(Number::from))),
            )
        }))
    }

    pub fn rotate(&mut self, x: bool, y: bool, z: bool) {
        if x {
            self.shape = rotate_x_3d_array(&self.shape, 0)
        }
        if y {
            self.shape = rotate_y_3d_array(&self.shape, 0)
        }
        if z {
            self.shape = rotate_z_3d_array(&self.shape, 0)
        }
        trim_3d_array(&mut self.shape, 0);
        let (height, depth, width) = get_shape_3d_array(&self.shape);
        self.metadata.height = height;
        self.metadata.depth = depth;
        self.metadata.width = width;
    }

    #[cfg(feature = "convert")]
    pub fn from_image_grayscale(
        image_data: &[u8],
        options: GrayscaleConvertImageOptions,
    ) -> Result<Build, JsValue> {
        let image = open_image(Cursor::new(image_data), options.base)?;

        convert_image_grayscale(image, options)
    }

    #[cfg(feature = "convert")]
    pub fn from_image_color_flat(
        image_data: &[u8],
        options: ColorFlatConvertImageOptions,
    ) -> Result<Build, JsValue> {
        let image = open_image(Cursor::new(image_data), options.base)?;

        convert_image_color_flat(image, options)
    }
    #[cfg(feature = "convert")]
    pub fn from_model(model_data: &[u8], scale: usize) -> Result<Build, JsValue> {
        let mut shape = voxelize(Cursor::new(model_data), scale)?;
        trim_3d_array(&mut shape, 0);
        let block_count = count_not_null_3d_array(&shape, 0) as u32;
        let (height, depth, width) = get_shape_3d_array(&shape);
        Ok(Build {
            shape,
            palette: Vec::new(),
            metadata: BuildMetadata {
                r#type: BuildType::Model(ModelMetadata {}),
                width,
                depth,
                height,
                block_count,
            },
        })
    }

    #[cfg(feature = "convert")]
    pub fn regenerate_preview(&mut self) {
        match &self.metadata.r#type {
            BuildType::GrayImage(image_metadata) => {
                let mut image_metadata = image_metadata.clone();
                image_metadata.preview = compute_grayscale_preview(&self.shape);
                self.metadata.r#type = BuildType::GrayImage(image_metadata);
            }
            BuildType::ColorImage(image_metadata) => {
                let mut image_metadata = image_metadata.clone();
                image_metadata.preview = compute_color_preview(&self.shape, &self.palette);
                self.metadata.r#type = BuildType::ColorImage(image_metadata);
            }
            _ => {}
        }
    }
}
