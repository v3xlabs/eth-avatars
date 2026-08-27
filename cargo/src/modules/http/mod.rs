use std::str::FromStr;

use super::LocatorError;
use crate::resource::{Locator, Resource};

#[cfg(feature = "reqwest")]
pub mod client;

#[derive(Debug, PartialEq, Eq)]
pub struct Http {
    pub url: String,
}

impl FromStr for Http {
    type Err = LocatorError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self { url: s.to_string() })
    }
}

impl Locator for Http {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Http(http) => Some(http),
            _ => None,
        }
    }
}
