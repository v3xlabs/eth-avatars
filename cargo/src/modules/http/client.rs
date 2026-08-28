use async_trait::async_trait;
use reqwest::Client as ReqwestClient;

use super::Http;
use crate::{AvatarError, Fetcher, Resource};

#[derive(Default)]
pub struct HttpFetcher {
    client: ReqwestClient,
}

impl From<ReqwestClient> for HttpFetcher {
    fn from(client: ReqwestClient) -> Self {
        Self { client }
    }
}

#[async_trait]
impl Fetcher for HttpFetcher {
    type Locator = Http;

    async fn fetch(&self, locator: &Http) -> Result<Resource, AvatarError> {
        let response = self.client.get(&locator.url).send().await?;
        let status = response.status();

        if !status.is_success() {
            return Err(AvatarError::Status {
                status: status.as_u16(),
            });
        }

        Ok(response.bytes().await?.to_vec().into())
    }
}
