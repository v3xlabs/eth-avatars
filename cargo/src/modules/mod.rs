use async_trait::async_trait;

use crate::resource::{Locator, Resource};

pub mod arweave;
pub mod error;
pub mod ethereum;
pub mod http;
pub mod ipfs;
pub mod swarm;

pub use {error::FetchError, error::LocatorError};

#[async_trait]
pub trait Fetcher: Send + Sync {
    type Locator: Locator;

    async fn fetch(&self, locator: &Self::Locator) -> Result<Resource, FetchError>;
}

#[async_trait]
pub(crate) trait AnyFetcher: Send + Sync {
    async fn fetch_any(&self, resource: &Resource) -> Option<Result<Resource, FetchError>>;
}

#[async_trait]
impl<F: Fetcher> AnyFetcher for F {
    async fn fetch_any(&self, resource: &Resource) -> Option<Result<Resource, FetchError>> {
        Some(self.fetch(F::Locator::of(resource)?).await)
    }
}
