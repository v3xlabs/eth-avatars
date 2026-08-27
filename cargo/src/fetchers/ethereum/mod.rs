use std::str::FromStr;

use crate::resource::{Locator, Resource};

#[derive(Debug, PartialEq, Eq)]
pub struct Ethereum {
    pub chain_id: u64,
    pub contract: String,
    pub token_id: String,
}

impl FromStr for Ethereum {
    type Err = std::str::Utf8Error;

    fn from_str(_s: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}

impl Locator for Ethereum {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Ethereum(ethereum) => Some(ethereum),
            _ => None,
        }
    }
}
