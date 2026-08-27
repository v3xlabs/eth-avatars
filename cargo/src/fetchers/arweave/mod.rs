use std::str::FromStr;

use crate::resource::{Locator, Resource};

#[derive(Debug, PartialEq, Eq)]
pub struct Arweave {
    pub transaction: String,
}

impl FromStr for Arweave {
    type Err = std::str::Utf8Error;

    fn from_str(_s: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}

impl Locator for Arweave {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Arweave(arweave) => Some(arweave),
            _ => None,
        }
    }
}
