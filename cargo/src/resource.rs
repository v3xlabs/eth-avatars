use std::str::FromStr;

use crate::{
    LocatorError,
    modules::{arweave::Arweave, ethereum::Ethereum, http::Http, ipfs::Ipfs, swarm::Swarm},
};

pub enum Resource {
    Raw(Vec<u8>),
    Http(Http),
    Ipfs(Ipfs),
    Swarm(Swarm),
    Arweave(Arweave),
    Ethereum(Ethereum),
}

pub trait Locator: Sized + Send + Sync + 'static + FromStr<Err = LocatorError> + PartialEq {
    fn of(resource: &Resource) -> Option<&Self>;
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
            _ => Err(LocatorError::Invalid),
        }
    }
}
