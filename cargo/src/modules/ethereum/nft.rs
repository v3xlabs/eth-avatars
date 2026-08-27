use serde::Deserialize;

use crate::{FetchError, Resource, resource::Decoder};

#[derive(Deserialize)]
pub struct NftMetadata {
    pub image: Option<String>,
}

pub struct NftMetadataDecoder;

impl Decoder for NftMetadataDecoder {
    fn decode(&self, bytes: Vec<u8>) -> Result<Resource, FetchError> {
        serde_json::from_slice::<NftMetadata>(&bytes)
            .map_err(|_| FetchError::Unsupported)
            .and_then(|x| x.image.ok_or(FetchError::Unsupported))
            .and_then(|x| x.parse().map_err(Into::into))
    }
}
