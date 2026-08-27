use std::str::FromStr;

use crate::{Locator, LocatorError, Resource};

#[derive(Debug, PartialEq, Eq)]
pub struct Swarm {
    pub reference: String,
}

impl FromStr for Swarm {
    type Err = LocatorError;

    fn from_str(_s: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}

impl Locator for Swarm {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Swarm(swarm) => Some(swarm),
            _ => None,
        }
    }
}
