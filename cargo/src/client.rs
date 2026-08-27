use std::sync::Arc;

use crate::{AnyFetcher, Fetcher, FetchError, Resource};

pub struct AvatarClient {
    fetchers: Vec<Arc<dyn AnyFetcher>>,
    max_hops: usize,
}

const DEFAULT_MAX_HOPS: usize = 4;

impl Default for AvatarClient {
    fn default() -> Self {
        Self {
            fetchers: Vec::new(),
            max_hops: DEFAULT_MAX_HOPS,
        }
    }
}

impl AvatarClient {
    pub fn with_fetcher(mut self, fetcher: impl Fetcher + 'static) -> Self {
        self.fetchers.push(Arc::new(fetcher));
        self
    }

    pub fn with_max_hops(mut self, max_hops: usize) -> Self {
        self.max_hops = max_hops;
        self
    }

    pub async fn fetch(&self, resource: Resource) -> Result<Vec<u8>, FetchError> {
        let mut current = resource;

        for _ in 0..self.max_hops {
            match current {
                Resource::Raw(bytes) => return Ok(bytes),
                pending => match self.step(&pending).await? {
                    Resource::Raw(bytes) => return Ok(bytes),
                    next => current = next,
                },
            }
        }

        Err(FetchError::TooManyHops {
            hops: self.max_hops,
        })
    }

    async fn step(&self, resource: &Resource) -> Result<Resource, FetchError> {
        let mut failure = None;

        for fetcher in &self.fetchers {
            match fetcher.fetch_any(resource).await {
                None => continue,
                Some(Ok(fetched)) => return Ok(fetched),
                Some(Err(error)) => {
                    tracing::warn!(%error, "fetcher failed");
                    failure = Some(error);
                }
            }
        }

        Err(failure.unwrap_or(FetchError::Unsupported))
    }
}
