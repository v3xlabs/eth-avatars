use std::str::FromStr;

use super::LocatorError;
use crate::resource::{Locator, Resource};

#[derive(Debug, PartialEq, Eq)]
pub struct Arweave {
    pub transaction: String,
}

impl FromStr for Arweave {
    type Err = LocatorError;

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
