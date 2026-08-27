use std::str::FromStr;

use crate::{Locator, LocatorError, Resource};

#[cfg(feature = "reqwest")]
pub mod client;
#[cfg(feature = "reqwest")]
pub use client::HttpFetcher;

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
