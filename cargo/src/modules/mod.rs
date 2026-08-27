use async_trait::async_trait;

use crate::{FetchError, Locator, Resource};

pub mod arweave;
pub mod ethereum;
pub mod http;
pub mod ipfs;
pub mod swarm;

#[async_trait]
pub trait Fetcher: Send + Sync {
    type Locator: Locator;

    fn accepts(&self, _locator: &Self::Locator) -> bool {
        true
    }

    async fn fetch(&self, locator: &Self::Locator) -> Result<Resource, FetchError>;
}

#[async_trait]
pub trait AnyFetcher: Send + Sync {
    async fn fetch_any(&self, resource: &Resource) -> Option<Result<Resource, FetchError>>;
}

#[async_trait]
impl<F: Fetcher> AnyFetcher for F {
    async fn fetch_any(&self, resource: &Resource) -> Option<Result<Resource, FetchError>> {
        let locator = F::Locator::of(resource)?;

        self.accepts(locator).then_some(())?;

        Some(self.fetch(locator).await)
    }
}
