/*!
`eth-avatars` is a library for fetching avatars, resolving urls, and more.

In simplest terms, the crate turns "ipfs://.." and "eip155:..." into your preferred output (`Url` or `Vec<u8>`).

This crate is not limited to just avatars, it also works great for banners, and much more.

# Overview

Here is a simple example showing off how you can use `eth-avatars`:
```rust
use eth_avatars::{Client, modules::{ipfs::IpfsGateway, http::HttpFetcher}};

#[tokio::main]
pub async fn main() {
    let http_client = reqwest::Client::default();
    let client = Client::default()
        .with_fetcher(IpfsGateway::new("https://ipfs.io/"))
        .with_fetcher(HttpFetcher::from(http_client));

    let resource = "ipfs://bafkreifnrjhkl7ccr2ifwn2n7ap6dh2way25a6w5x2szegvj5pt4b5nvfu".parse().unwrap();
    let data = client.fetch(resource).await.unwrap();
}
```

## Configurable Sources

You can configure any of the below sources (one minimum) to support a protocol.

- [`Http`](`modules::http::Http`)
  - [`http::HttpFetcher`](`modules::http::HttpFetcher`)
- [`Ipfs`](`modules::ipfs::Ipfs`)
    - [`ipfs::IpfsGateway`](`modules::ipfs::IpfsGateway`)
- [`Swarm`](`modules::swarm::Swarm`)
    - [`swarm::SwarmGateway`](`modules::swarm::SwarmGateway`)
- [`Arweave`](`modules::arweave::Arweave`) module is still under development
- [`Ethereum`](`modules::ethereum::Ethereum`)
    - [`ethereum::EthereumResolver`](`modules::ethereum::EthereumResolver`)

## Features

`reqwest` enables reqwest support.

*/

pub mod client;
pub mod error;
pub mod modules;
pub mod resource;
pub mod utils;

pub use {
    client::Client,
    error::{AvatarError, LocatorError},
    modules::{AnyFetcher, Fetcher},
    resource::{Locator, Resource},
};
