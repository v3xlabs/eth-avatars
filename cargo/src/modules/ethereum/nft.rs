use serde::Deserialize;

use crate::{FetchError, Resource, resource::Decoder};

#[derive(Deserialize)]
pub struct NftMetadata {
    pub image: Option<String>,
    pub image_url: Option<String>,
    pub image_data: Option<String>,
}

pub struct NftMetadataDecoder;

impl Decoder for NftMetadataDecoder {
    fn decode(&self, bytes: Vec<u8>) -> Result<Resource, FetchError> {
        serde_json::from_slice::<NftMetadata>(&bytes)
            .map_err(|_| FetchError::Unsupported)
            .and_then(|metadata| {
                metadata
                    .image
                    .or(metadata.image_url)
                    .or(metadata.image_data)
                    .ok_or(FetchError::Unsupported)
            })
            .and_then(|image| {
                if image.starts_with('<') {
                    Ok(Resource::Raw(image.into_bytes()))
                } else {
                    image.parse().map_err(Into::into)
                }
            })
    }
}
