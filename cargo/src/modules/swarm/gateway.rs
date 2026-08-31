use async_trait::async_trait;

use super::super::http::Http;
use super::Swarm;
use crate::{AvatarError, Fetcher, Resource};

/**
* SwarmGateway is a rewriter that rewrites [`Resource::Swarm`] to [`Resource::Http`] with a given gateway base_url.
*/
pub struct SwarmGateway {
    base_url: String,
}

impl SwarmGateway {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
        }
    }
}

#[async_trait]
impl Fetcher for SwarmGateway {
    type Locator = Swarm;

    async fn fetch(&self, locator: &Swarm) -> Result<Resource, AvatarError> {
        let mut url = self
            .base_url
            .replace("{reference}", &locator.reference)
            .trim_end_matches("/")
            .to_string();

        if let Some(path) = &locator.path {
            url.push('/');
            url.push_str(path.trim_start_matches('/'));
        }

        Ok(Http { url }.into())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        modules::{
            Fetcher,
            http::Http,
            swarm::{Swarm, gateway::SwarmGateway},
        },
        resource::Resource,
    };
    use std::str::FromStr;

    #[tokio::test]
    async fn redirects_swarm_url() {
        let input: Swarm = "bzz://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        let gateway = SwarmGateway::new("https://{reference}.bzz.link/");
        let result = gateway.fetch(&input).await.unwrap();
        let result = match result {
            Resource::Http(x) => Some(x),
            _ => None,
        };
        assert_eq!(
            result.unwrap(),
            Http::from_str(
                "https://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu.bzz.link"
            )
            .unwrap()
        );
    }

    #[tokio::test]
    async fn redirects_swarm_url_different_reference() {
        let input: Swarm = "bzz://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();
        let gateway = SwarmGateway::new("https://bzz.link/bzz/{reference}/");
        let result = gateway.fetch(&input).await.unwrap();
        let result = match result {
            Resource::Http(x) => Some(x),
            _ => None,
        };
        assert_eq!(
            result.unwrap(),
            Http::from_str(
                "https://bzz.link/bzz/bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            )
            .unwrap()
        );
    }
}
