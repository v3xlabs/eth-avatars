use thiserror::Error;

#[derive(Debug, Error)]
pub enum FetchError {
    #[error("no registered fetcher accepts this resource")]
    Unsupported,

    #[error("resource did not resolve to data within {hops} hops")]
    TooManyHops { hops: usize },

    #[error("gateway returned status {status}")]
    Status { status: u16 },

    #[cfg(feature = "reqwest")]
    #[error(transparent)]
    Transport(#[from] reqwest::Error),
}
