use std::{str::FromStr, sync::Arc};

use async_trait::async_trait;

use super::{
    ContractType, Ethereum,
    abi::{IERC721, IERC1155},
};
use crate::{
    FetchError, Fetcher,
    Resource::{self},
    modules::ethereum::nft::NftMetadataDecoder,
};

use alloy::{primitives::ChainId, providers::DynProvider};

/**
* EthereumResolver resolves [`Resource::Ethereum`] to [`Resource::Decode`] for further processing.
* It takes a [`DynProvider`] from [`alloy`].
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
        let contract = locator.contract;
        let network_id = locator.network_id;
        let contract_type = locator.contract_type;
        let token_id = locator.token_id;

        if network_id != self.network_id {
            return Err(FetchError::Unsupported);
        };

        let url = match contract_type {
            ContractType::ERC721 => {
                IERC721::new(contract, &self.provider)
                    .tokenURI(token_id)
                    .call()
                    .await
            }
            ContractType::ERC1155 => {
                IERC1155::new(contract, &self.provider)
                    .uri(token_id)
                    .call()
                    .await
            }
        }?;
        let url = url.replace("{id}", &token_id.to_string());

        Ok(Resource::Decode {
            source: Box::new(Resource::from_str(&url)?),
            decoder: Arc::new(NftMetadataDecoder),
        })
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
        let Resource::Decode { source, .. } = gateway.fetch(&input).await.unwrap() else {
            panic!("expected a decode step");
        };
        let Resource::Http(url) = *source else {
            panic!("expected an http metadata source");
        };

        assert_eq!(
            url,
            Http::from_str(
                "https://api.opensea.io/api/v1/metadata/0x495f947276749Ce646f68AC8c248420045cb7b5e/0x109791375735522898048150917964456965919994596086232976516654423066184641413121"
            )
            .unwrap()
        );
    }
}
