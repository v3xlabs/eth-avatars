use std::str::FromStr;

use crate::resource::{Locator, Resource};

pub mod gateway;

#[derive(Debug, PartialEq, Eq)]
pub struct Ipfs {
    pub cid: String,
    pub path: Option<String>,
}

impl FromStr for Ipfs {
    type Err = std::str::Utf8Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (cid, path): (&str, Option<&str>) = match s.split_once('/') {
            Some((cid, path)) => (cid, Some(path)),
            None => (s, None),
        };
        Ok(Self {
            cid: cid.to_string(),
            path: path.map(|s| s.to_string()),
        })
    }
}

impl Locator for Ipfs {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Ipfs(ipfs) => Some(ipfs),
            _ => None,
        }
    }
}
