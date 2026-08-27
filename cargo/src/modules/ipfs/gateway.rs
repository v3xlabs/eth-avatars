use async_trait::async_trait;

use super::super::http::Http;
use super::Ipfs;
use crate::{AvatarClient, FetchError, Fetcher, Resource};

/**
* IpfsGateway is a rewriter that rewrites [`Resource::Ipfs`] to [`Resource::Http`] with a given gateway base_url.
*/
pub struct IpfsGateway {
    base_url: String,
}

impl IpfsGateway {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
        }
    }
}

#[async_trait]
impl Fetcher for IpfsGateway {
    type Locator = Ipfs;

    async fn fetch(&self, locator: &Ipfs, _client: &AvatarClient) -> Result<Resource, FetchError> {
        let mut url = format!(
            "{}/{}/{}",
            self.base_url.trim_end_matches('/'),
            locator.schema,
            locator.cid
        );

        if let Some(path) = &locator.path {
            url.push('/');
            url.push_str(path.trim_start_matches('/'));
        }

        Ok(Resource::Http(Http { url }))
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        AvatarClient,
        modules::{
            Fetcher,
            http::Http,
            ipfs::{Ipfs, gateway::IpfsGateway},
        },
        resource::Resource,
    };
    use std::str::FromStr;

    #[tokio::test]
    async fn redirects_ipfs_url() {
        let input: Ipfs = "ipfs://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        let client = AvatarClient::default();
        let gateway = IpfsGateway::new("https://ipfs.io/");
        let result = gateway.fetch(&input, &client).await.unwrap();
        let result = match result {
            Resource::Http(x) => Some(x),
            _ => None,
        };
        assert_eq!(
            result.unwrap(),
            Http::from_str(
                "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            )
            .unwrap()
        );
    }
}
