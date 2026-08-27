use std::{str::FromStr, sync::LazyLock};

use alloy::primitives::{Address, ChainId, U256};
use regex::Regex;
use strum::{Display, EnumString};

use crate::{Locator, LocatorError, Resource};

pub mod abi;
pub mod nft;
pub mod resolver;
pub use resolver::EthereumResolver;

#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumString, Display)]
#[strum(ascii_case_insensitive, serialize_all = "snake_case")]
pub enum ContractType {
    ERC721,
    ERC1155,
}

/**
 * CAIP-2 Ethereum `eip155:` Uri
 */
#[derive(Debug, PartialEq, Eq)]
pub struct Ethereum {
    pub network_id: ChainId,
    pub contract_type: ContractType,
    pub contract: Address,
    pub token_id: U256,
}

static EIP155_URI: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?i:eip155):([0-9]+)/(?i:(erc1155|erc721)):0x([0-9a-fA-F]{40})/([0-9]+)$")
        .expect("should be a valid regex")
});

impl FromStr for Ethereum {
    type Err = LocatorError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (_, [network_id, contract_type, contract, token_id]) = EIP155_URI
            .captures(s)
            .ok_or(LocatorError::Invalid)?
            .extract();

        Ok(Self {
            network_id: network_id.parse().map_err(|_| LocatorError::Invalid)?,
            contract_type: contract_type.parse().map_err(|_| LocatorError::Invalid)?,
            contract: contract.parse().map_err(|_| LocatorError::Invalid)?,
            token_id: U256::from_str_radix(token_id, 10).map_err(|_| LocatorError::Invalid)?,
        })
    }
}

impl Locator for Ethereum {
    fn of(resource: &Resource) -> Option<&Self> {
        match resource {
            Resource::Ethereum(ethereum) => Some(ethereum),
            _ => None,
        }
    }
}
