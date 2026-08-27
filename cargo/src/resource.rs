use std::{str::FromStr, sync::Arc};

use crate::{
    FetchError, LocatorError,
    Resource::Unresolved,
    modules::{arweave::Arweave, ethereum::Ethereum, http::Http, ipfs::Ipfs, swarm::Swarm},
};

pub type Dyncoder = Arc<dyn Decoder>;

pub trait Decoder: Send + Sync + 'static {
    fn decode(&self, bytes: Vec<u8>) -> Result<Resource, FetchError>;
}

pub trait Locator: Sized + Send + Sync + 'static + FromStr<Err = LocatorError> + PartialEq {
    fn of(resource: &Resource) -> Option<&Self>;
}

pub enum Resource {
    Raw(Vec<u8>),
    Unresolved(String),
    Http(Http),
    Ipfs(Ipfs),
    Swarm(Swarm),
    Arweave(Arweave),
    Ethereum(Ethereum),
    Decode {
        source: Box<Resource>,
        decoder: Dyncoder,
    },
}

impl From<Vec<u8>> for Resource {
    fn from(bytes: Vec<u8>) -> Self {
        Self::Raw(bytes)
    }
}

impl From<Http> for Resource {
    fn from(http: Http) -> Self {
        Self::Http(http)
    }
}

impl From<Ipfs> for Resource {
    fn from(ipfs: Ipfs) -> Self {
        Self::Ipfs(ipfs)
    }
}

impl From<Swarm> for Resource {
    fn from(swarm: Swarm) -> Self {
        Self::Swarm(swarm)
    }
}

impl From<Arweave> for Resource {
    fn from(arweave: Arweave) -> Self {
        Self::Arweave(arweave)
    }
}

impl From<Ethereum> for Resource {
    fn from(ethereum: Ethereum) -> Self {
        Self::Ethereum(ethereum)
    }
}

impl FromStr for Resource {
    type Err = LocatorError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (schema, _) = s.split_once(':').ok_or(LocatorError::NoSchema)?;

        match schema.to_lowercase().as_str() {
            "ipfs" | "ipns" => s.parse().map(Resource::Ipfs),
            "bzz" => s.parse().map(Resource::Swarm),
            "ar" => s.parse().map(Resource::Arweave),
            "eip155" => s.parse().map(Resource::Ethereum),
            "http" | "https" => s.parse().map(Resource::Http),
            // "data" => decode_data_uri(rest).map(Resource::Raw),
            _ => Ok(Unresolved(s.to_string())),
        }
    }
}

impl Resource {
    pub fn decoded_by(self, decoder: impl Decoder) -> Self {
        Self::Decode {
            source: Box::new(self),
            decoder: Arc::new(decoder),
        }
    }
}
