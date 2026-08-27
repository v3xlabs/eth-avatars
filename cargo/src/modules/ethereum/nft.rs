use serde::Deserialize;

use crate::{FetchError, Resource, resource::Decoder};

#[derive(Deserialize)]
pub struct NftMetadata {
    pub image: Option<String>,
}

pub struct NftMetadataDecoder;

impl Decoder for NftMetadataDecoder {
    fn decode(&self, bytes: Vec<u8>) -> Result<Resource, FetchError> {
        let metadata: NftMetadata =
            serde_json::from_slice(&bytes).map_err(|_| FetchError::Unsupported)?;

        metadata
            .image
            .ok_or(FetchError::Unsupported)?
            .parse()
            .map_err(Into::into)
    }
}
