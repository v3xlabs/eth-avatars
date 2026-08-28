use std::str::FromStr;

use async_trait::async_trait;

use crate::{FetchError, Fetcher, Locator, LocatorError, Resource, modules::http::Http};

#[derive(Debug, PartialEq, Eq)]
pub struct Swarm {
    pub reference: String,
    pub path: Option<String>,
}

impl FromStr for Swarm {
    type Err = LocatorError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (_, rest) = s.split_once(':').ok_or(LocatorError::NoSchema)?;
        let rest = rest.trim_start_matches('/');
        let (reference, path) = match rest.split_once('/') {
            Some((reference, path)) => (reference, Some(path)),
            None => (rest, None),
        };
        if reference.is_empty() {
            return Err(LocatorError::SwarmEmptyReference);
        }

        Ok(Self {
            reference: reference.to_string(),
            path: path.filter(|path| !path.is_empty()).map(str::to_string),
        })
    }
}

/** Rewrites `bzz:` resources through a configured Swarm gateway. */
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

    async fn fetch(&self, locator: &Swarm) -> Result<Resource, FetchError> {
        let mut url = format!(
            "{}/bzz/{}",
            self.base_url.trim_end_matches('/'),
            locator.reference,
        );
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
        Fetcher,
        modules::{http::Http, swarm::SwarmGateway},
        resource::Resource,
    };

    use super::Swarm;

    #[test]
    fn parses_bzz_url() {
        let resource: Swarm = "bzz://aabbcc/file.png".parse().unwrap();
        assert_eq!(resource.reference, "aabbcc");
        assert_eq!(resource.path.as_deref(), Some("file.png"));
    }

    #[tokio::test]
    async fn rewrites_bzz_url() {
        let resource: Swarm = "bzz://aabbcc/file.png".parse().unwrap();
        let gateway = SwarmGateway::new("https://swarm.example/");
        let result = gateway.fetch(&resource).await.unwrap();
        assert!(matches!(
            result,
            Resource::Http(Http { url }) if url == "https://swarm.example/bzz/aabbcc/file.png"
        ));
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
