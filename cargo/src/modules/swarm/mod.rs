use std::str::FromStr;

use crate::{Locator, LocatorError, Resource};

pub mod gateway;
pub use gateway::SwarmGateway;

#[derive(Debug, PartialEq, Eq)]
pub struct Swarm {
    pub reference: String,
    pub path: Option<String>,
}

impl Locator for Swarm {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Swarm(swarm) => Some(swarm),
            _ => None,
        }
    }
}

impl FromStr for Swarm {
    type Err = LocatorError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (_schema, rest) = s.split_once(':').ok_or(LocatorError::IpfsSchema)?;
        let rest = rest.trim_start_matches('/');

        let (reference, path) = match rest.split_once('/') {
            Some((cid, path)) => (cid, Some(path)),
            None => (rest, None),
        };

        if reference.is_empty() {
            return Err(LocatorError::IpfsEmptyCid);
        }

        Ok(Self {
            reference: reference.to_string(),
            path: path.filter(|path| !path.is_empty()).map(str::to_string),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn swarm_url_no_path() {
        let input: Swarm = "ipfs://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        // assert_eq!(input.schema, Swarm::Ipfs);
        assert_eq!(
            input.reference,
            "bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
        );
        assert_eq!(input.path, None);
    }
}
