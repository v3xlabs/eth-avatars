use async_trait::async_trait;
use reqwest::Client;

use super::Http;
use crate::{AvatarClient, FetchError, Fetcher, Resource};

#[derive(Default)]
pub struct HttpFetcher {
    client: Client,
}

impl From<Client> for HttpFetcher {
    fn from(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl Fetcher for HttpFetcher {
    type Locator = Http;

    async fn fetch(&self, locator: &Http, _client: &AvatarClient) -> Result<Resource, FetchError> {
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
