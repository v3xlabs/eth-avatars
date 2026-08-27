use async_trait::async_trait;

use crate::{AvatarClient, FetchError, Locator, Resource};

pub mod arweave;
pub mod ethereum;
pub mod http;
pub mod ipfs;
pub mod swarm;

#[async_trait]
pub trait Fetcher: Send + Sync {
    type Locator: Locator;

    async fn fetch(
        &self,
        locator: &Self::Locator,
        client: &AvatarClient,
    ) -> Result<Resource, FetchError>;
}

#[async_trait]
pub trait AnyFetcher: Send + Sync {
    async fn fetch_any(
        &self,
        resource: &Resource,
        client: &AvatarClient,
    ) -> Option<Result<Resource, FetchError>>;
}

#[async_trait]
impl<F: Fetcher> AnyFetcher for F {
    async fn fetch_any(
        &self,
        resource: &Resource,
        client: &AvatarClient,
    ) -> Option<Result<Resource, FetchError>> {
        Some(self.fetch(F::Locator::of(resource)?, client).await)
    }
}
