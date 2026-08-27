use alloy::sol;

sol! {
    #[sol(rpc)]
    interface IERC721 {
        function tokenURI(uint256 tokenId) external view returns (string);
    }
    #[sol(rpc)]
    interface IERC1155 {
        function uri(uint256 id) external view returns (string);
    }
}
