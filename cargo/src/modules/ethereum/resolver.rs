use async_trait::async_trait;

use super::{
    Ethereum,
    ContractType,
    abi::{IERC721, IERC1155},
};
use crate::{FetchError, Fetcher, Resource};

use alloy::{primitives::ChainId, providers::DynProvider};

/**
* EthereumResolver is a rewriter that rewrites [`Resource::Ethereum`] to [`Resource::Unresolved`] with a given gateway base_url.
*/
pub struct EthereumResolver {
    provider: DynProvider,
    network_id: ChainId,
}

impl EthereumResolver {
    pub fn new(network_id: ChainId, provider: DynProvider) -> Self {
        Self {
            network_id,
            provider,
        }
    }
}

#[async_trait]
impl Fetcher for EthereumResolver {
    type Locator = Ethereum;

    async fn fetch(&self, locator: &Ethereum) -> Result<Resource, FetchError> {
        if locator.network_id != self.network_id {
            return Err(FetchError::Unsupported);
        };

        let url = match locator.contract_type {
            ContractType::ERC721 => {
                IERC721::new(locator.contract, &self.provider)
                    .tokenURI(locator.token_id)
                    .call()
                    .await
            }
            ContractType::ERC1155 => {
                IERC1155::new(locator.contract, &self.provider)
                    .uri(locator.token_id)
                    .call()
                    .await
            }
        }?;

        let url = url.replace("{id}", &locator.token_id.to_string());

        Ok(url.parse::<Resource>()?)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use crate::{modules::http::Http, utils::test::get_test_provider};

    use super::*;

    #[tokio::test]
    async fn eip155_opensea() {
        let input: Ethereum = "eip155:1/erc1155:0x495f947276749ce646f68ac8c248420045cb7b5e/109791375735522898048150917964456965919994596086232976516654423066184641413121"
            .parse()
            .unwrap();
        let provider = get_test_provider().await;
        let gateway = EthereumResolver::new(1, provider);
        let result = gateway.fetch(&input).await.unwrap();
        let result = match result {
            Resource::Http(x) => Some(x),
            _ => None,
        };
        assert_eq!(
            result.unwrap(),
            Http::from_str(
                "https://api.opensea.io/api/v1/metadata/0x495f947276749Ce646f68AC8c248420045cb7b5e/0x109791375735522898048150917964456965919994596086232976516654423066184641413121"
            )
            .unwrap()
        );
    }
}
