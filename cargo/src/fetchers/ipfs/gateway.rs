use async_trait::async_trait;

use crate::{
    fetchers::{Fetcher, error::FetchError, http::Http, ipfs::Ipfs},
    resource::Resource,
};

pub struct IpfsGateway {
    base: String,
}

impl IpfsGateway {
    pub fn new(base: impl Into<String>) -> Self {
        Self { base: base.into() }
    }
}

#[async_trait]
impl Fetcher for IpfsGateway {
    type Locator = Ipfs;

    async fn fetch(&self, locator: &Ipfs) -> Result<Resource, FetchError> {
        let mut url = format!("{}/ipfs/{}", self.base.trim_end_matches('/'), locator.cid);

        if let Some(path) = &locator.path {
            url.push('/');
            url.push_str(path.trim_start_matches('/'));
        }

        Ok(Resource::Http(Http { url }))
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use crate::{
        fetchers::{
            Fetcher,
            http::Http,
            ipfs::{Ipfs, gateway::IpfsGateway},
        },
        resource::Resource::{self, Http},
    };

    #[tokio::test]
    async fn redirects_ipfs_url() {
        let input: Ipfs = "ipfs://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        let gateway = IpfsGateway::new("https://ipfs.io/");
        let result = gateway.fetch(&input).await.unwrap();
        let result = match result {
            Http(x) => Some(x),
            _ => None,
        };
        assert_eq!(
            Http::from_str(
                "https://ipfs.io/ipfs/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            )
            .unwrap(),
            result.unwrap()
        );
    }
}
