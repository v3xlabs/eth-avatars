use std::str::FromStr;

use crate::{Locator, Resource, LocatorError};

pub mod gateway;
pub use gateway::IpfsGateway;

#[derive(Debug, PartialEq, Eq)]
pub enum IpfsSchema {
    Ipfs,
    Ipns,
}

impl IpfsSchema {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ipfs => "ipfs",
            Self::Ipns => "ipns",
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct Ipfs {
    pub schema: IpfsSchema,
    pub cid: String,
    pub path: Option<String>,
}

impl Locator for Ipfs {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Ipfs(ipfs) => Some(ipfs),
            _ => None,
        }
    }
}

impl FromStr for IpfsSchema {
    type Err = LocatorError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ipfs" => Ok(Self::Ipfs),
            "ipns" => Ok(Self::Ipns),
            _ => Err(LocatorError::IpfsSchema),
        }
    }
}

impl FromStr for Ipfs {
    type Err = LocatorError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (schema, rest) = s.split_once(':').ok_or(LocatorError::IpfsSchema)?;
        let schema = schema.parse()?;
        let rest = rest.trim_start_matches('/');

        let (cid, path) = match rest.split_once('/') {
            Some((cid, path)) => (cid, Some(path)),
            None => (rest, None),
        };

        if cid.is_empty() {
            return Err(LocatorError::IpfsEmptyCid);
        }

        Ok(Self {
            schema,
            cid: cid.to_string(),
            path: path.filter(|path| !path.is_empty()).map(str::to_string),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn ipfs_url_no_path() {
        let input: Ipfs = "ipfs://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        assert_eq!(input.schema, IpfsSchema::Ipfs);
        assert_eq!(
            input.cid,
            "bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
        );
        assert_eq!(input.path, None);
    }

    #[tokio::test]
    async fn ipfs_url_short_schema() {
        let input: Ipfs = "ipfs:/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        assert_eq!(input.schema, IpfsSchema::Ipfs);
        assert_eq!(
            input.cid,
            "bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
        );
        assert_eq!(input.path, None);
    }

    #[tokio::test]
    async fn ipfs_url_ipns() {
        let input: Ipfs = "ipns://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        assert_eq!(input.schema, IpfsSchema::Ipns);
        assert_eq!(
            input.cid,
            "bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
        );
        assert_eq!(input.path, None);
    }

    #[tokio::test]
    async fn ipfs_url_path() {
        let input: Ipfs =
            "ipfs://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu/hello/world.txt"
                .parse()
                .unwrap();
        assert_eq!(input.schema, IpfsSchema::Ipfs);
        assert_eq!(
            input.cid,
            "bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
        );
        assert_eq!(input.path.unwrap(), "hello/world.txt");
    }
}
