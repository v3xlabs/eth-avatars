use std::str::FromStr;

use crate::fetchers::{
    arweave::Arweave, error::LocatorError, ethereum::Ethereum, http::Http, ipfs::Ipfs, swarm::Swarm,
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
