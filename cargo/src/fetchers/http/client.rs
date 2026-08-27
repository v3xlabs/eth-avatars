use async_trait::async_trait;
use reqwest::Client;

use crate::{
    fetchers::{Fetcher, error::FetchError, http::Http},
    resource::Resource,
};

#[derive(Default)]
pub struct HttpFetcher {
    client: Client,
}

#[async_trait]
impl Fetcher for HttpFetcher {
    type Locator = Http;

    async fn fetch(&self, locator: &Http) -> Result<Resource, FetchError> {
        let response = self.client.get(&locator.url).send().await?;
        let status = response.status();

        if !status.is_success() {
            return Err(FetchError::Status {
                status: status.as_u16(),
            });
        }

        Ok(Resource::Raw(response.bytes().await?.to_vec()))
    }
}
