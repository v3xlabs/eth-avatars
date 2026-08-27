use std::sync::Arc;

use crate::{AnyFetcher, FetchError, Fetcher, Resource, resource::Decoder};

pub struct AvatarClient {
    fetchers: Vec<Arc<dyn AnyFetcher>>,
    max_hops: usize,
}

const DEFAULT_MAX_HOPS: usize = 5;

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
        let mut decoders: Vec<Arc<dyn Decoder>> = Vec::new();
        let mut hops = 0;

        loop {
            current = match current {
                Resource::Decode { source, decoder } => {
                    decoders.push(decoder);
                    *source
                }
                Resource::Raw(bytes) => match decoders.pop() {
                    None => return Ok(bytes),
                    Some(decoder) => decoder.decode(bytes)?,
                },
                pending => {
                    hops += 1;
                    if hops > self.max_hops {
                        return Err(FetchError::TooManyHops {
                            hops: self.max_hops,
                        });
                    }
                    self.step(&pending).await?
                }
            };
        }
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

#[cfg(test)]
mod tests {
    use crate::{AvatarClient, modules::ipfs::IpfsGateway, resource::Resource};

    #[cfg(feature = "reqwest")]
    #[tokio::test]
    async fn client_eip155_to_bytes() {
        use crate::{
            modules::{ethereum::resolver::EthereumResolver, http::HttpFetcher},
            utils::test::get_test_provider,
        };

        let mainnet_provider = get_test_provider().await;

        let client = AvatarClient::default()
            .with_fetcher(HttpFetcher::default())
            .with_fetcher(IpfsGateway::new("https://ipfs.io/"))
            .with_fetcher(EthereumResolver::new(1, mainnet_provider));

        let input: Resource = "eip155:1/erc1155:0x495f947276749ce646f68ac8c248420045cb7b5e/109791375735522898048150917964456965919994596086232976516654423066184641413121"
            .parse()
            .unwrap();

        let result = client.fetch(input).await.unwrap();

        assert_eq!(result.len(), 559490);
    }

    #[tokio::test]
    async fn client_ipfs_to_bytes() {
        use crate::modules::{http::HttpFetcher};

        let client = AvatarClient::default()
            .with_fetcher(HttpFetcher::default())
            .with_fetcher(IpfsGateway::new("https://ipfs.io/"));

        let input: Resource = "ipfs://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu"
            .parse()
            .unwrap();

        let result = client.fetch(input).await.unwrap();

        assert_eq!(result.len(), 26914);
    }
}
