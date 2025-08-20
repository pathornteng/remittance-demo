import { useState, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  AccountBalanceQuery,
  PrivateKey,
  TokenAssociateTransaction,
  TokenDeleteTransaction,
  TransferTransaction,
  TokenMintTransaction,
} from "@hashgraph/sdk";
import {
  Network,
  InitializationRequest,
  CreateRequest,
  ConnectRequest,
  SupportedWallets,
  TokenSupplyType,
  StableCoin,
  KYCRequest,
  GetAccountBalanceRequest,
  CashInRequest,
  BigDecimal,
  AssociateTokenRequest,
} from "@hashgraph/stablecoin-npm-sdk";
import {
  Close,
  CurrencyExchange,
  Delete,
  Link,
  Add,
  Money,
  Send,
} from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Modal,
  Snackbar,
  TextField,
} from "@mui/material";
import { Box } from "@mui/system";
import MirrorNodeAPI from "../api/mirror-node-api";
const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

const mirrorNodeConfig = {
  name: "Testnet Mirror Node",
  network: "testnet",
  baseUrl: "https://testnet.mirrornode.hedera.com/api/v1/",
  apiKey: "",
  headerName: "",
  selected: true,
};
const RPCNodeConfig = {
  name: "HashIO",
  network: "testnet",
  baseUrl: "https://testnet.hashio.io/api",
  apiKey: "",
  headerName: "",
  selected: true,
};

const Home = (props) => {
  const mirrorNodeDelay = 5000;
  const [hbarBalance, setHbarBalance] = useState("0");
  const [tokens, setTokens] = useState([]);
  const [tokenInfo, setTokenInfo] = useState({});
  const [accountInfo, setAccountInfo] = useState({});
  const [selectedToken, setSelectedToken] = useState({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [sigKey, setSigKey] = useState();
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });

  const accountRef = useRef();
  const amountRef = useRef();

  const accountNameRef = useRef();
  const accountIdRef = useRef();
  const accountPrivateKeyRef = useRef();

  const tokenIdRef = useRef();
  const mintAmountRef = useRef();

  useEffect(() => {
    setTokens([]);
    const fetchAccount = async () => {
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(props.accountId)
        .execute(props.client);
      setHbarBalance(accountBalance.hbars.toString());
      const api = new MirrorNodeAPI();
      const resp = await api.getAccount(props.accountId);
      const account = resp.data;
      const tokens = account.balance.tokens;
      let tokenRelationships = [];
      let tokenInfo = {};

      setLoading(true);
      for (const token of tokens) {
        let query = await api.getToken(token.token_id);
        query.data.balance = token.balance;
        tokenInfo[token.token_id] = query.data;
        tokenRelationships.push(token);
      }
      setTokenInfo(tokenInfo);
      setTokens(tokenRelationships);
      setLoading(false);
      setAccountInfo(account);
    };
    fetchAccount();
    setSigKey(PrivateKey.fromStringECDSA(props.privateKey));
  }, [
    props.accountId,
    props.account,
    props.accounts,
    props.client,
    props.privateKey,
    refreshCount,
  ]);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const addAccount = async () => {
    setBackdropOpen(true);
    try {
      const privateKey = PrivateKey.fromStringECDSA(
        accountPrivateKeyRef.current?.value
      );
      const newAccount = {
        name: accountNameRef.current?.value,
        accountId: accountIdRef.current?.value,
        privateKey: privateKey.toString(),
        publicKey: privateKey.publicKey.toString(),
      };
      const accountList = [...props.accounts, newAccount];
      props.setAccounts(accountList);
      localStorage.setItem("accounts", JSON.stringify(accountList));
      setSnackbar({
        message: "A new account is created!",
        severity: "success",
        open: true,
      });
      setAddAccountModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Creating new account failed " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const deleteAccount = () => {
    try {
      const currentAccounts = JSON.parse(localStorage.getItem("accounts"));
      const filteredAccounts = currentAccounts.filter(
        (account) => account.accountId !== props.account.accountId
      );
      props.changeAccount(filteredAccounts[0]);
      props.setAccounts(filteredAccounts);
      localStorage.setItem("accounts", JSON.stringify(filteredAccounts));

      setSnackbar({
        message: "Deleted account successfully",
        severity: "success",
        open: true,
      });
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to delete account " + err.toString(),
        severity: "error",
        open: true,
      });
    }
  };

  const transferToken = async () => {
    setBackdropOpen(true);
    try {
      const amount = parseInt(amountRef.current?.value);
      const receiverAccount = accountRef.current?.value;
      const transaction = await new TransferTransaction()
        .addTokenTransfer(selectedToken.token_id, props.accountId, -amount)
        .addTokenTransfer(selectedToken.token_id, receiverAccount, amount)
        .freezeWith(props.client);
      const signTx = await transaction.sign(sigKey);
      const txResponse = await signTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({
        message: "Tokens transfered successfully",
        severity: "success",
        open: true,
      });
      setTransferModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to transfer token " + err.toString(),
        severity: "error",
        open: true,
      });
      setTransferModalOpen(false);
    }
    setBackdropOpen(false);
  };

  const mintToken = async () => {
    setBackdropOpen(true);
    try {
      const tx = await new TokenMintTransaction()
        .setTokenId(selectedToken.token_id)
        .setAmount(parseInt(mintAmountRef.current?.value))
        .freezeWith(props.client);
      const signedTx = await tx.sign(sigKey);
      const txResponse = await signedTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({
        message: "Tokens minted successfully",
        severity: "success",
        open: true,
      });
      setMintModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to mint token " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const deleteToken = async (token) => {
    setBackdropOpen(true);
    try {
      const transaction = await new TokenDeleteTransaction()
        .setTokenId(token.token_id.toString())
        .freezeWith(props.client);
      const signTx = await transaction.sign(sigKey);
      const txResponse = await signTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      await delay(mirrorNodeDelay);
      setSnackbar({
        message: "Tokens deleted successfully",
        severity: "success",
        open: true,
      });
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to delete the token " + err.toString(),
        severity: "error",
        open: true,
      });
    }

    setBackdropOpen(false);
  };

  const tokenList = tokens
    .filter((token) => tokenInfo[token.token_id].type === "FUNGIBLE_COMMON")
    .map((token) => {
      return (
        <Grid item xs={6} key={token.token_id.toString()}>
          <Card sx={{ minWidth: 150 }}>
            <CardContent>
              <div>
                <b>TokenID:</b>{" "}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    "https://hashscan.io/testnet/token/" +
                    token.token_id.toString()
                  }
                >
                  {token.token_id.toString()}
                </a>
              </div>
              <div>
                <b>Name:</b>{" "}
                {tokenInfo[token.token_id.toString()]?.name?.toString()}
              </div>
              <div>
                <b>Symbol:</b>{" "}
                {tokenInfo[token.token_id.toString()]?.symbol?.toString()}
              </div>
              <div>
                <b>Balance:</b>{" "}
                {tokenInfo[token.token_id.toString()]?.balance?.toString()}
              </div>
              <div>
                <b>IsDeleted:</b>{" "}
                {tokenInfo[token.token_id.toString()]?.deleted?.toString()}
              </div>
              <div>
                <b>TokenType:</b>{" "}
                {tokenInfo[token.token_id.toString()]?.type?.toString()}
              </div>
              <hr />
              <div>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<Send />}
                  color="secondary"
                  onClick={() => {
                    setTransferModalOpen(true);
                    setSelectedToken(token);
                  }}
                >
                  Transfer
                </Button>{" "}
                {props.publicKey.includes(
                  tokenInfo[
                    token.token_id.toString()
                  ]?.admin_key?.key?.toString()
                ) && (
                  <span>
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<Money />}
                      color="secondary"
                      onClick={() => {
                        setSelectedToken(token);
                        setMintModalOpen(true);
                      }}
                    >
                      Mint
                    </Button>{" "}
                    <IconButton
                      color="error"
                      onClick={() => deleteToken(token)}
                      style={{ float: "right" }}
                    >
                      <Delete />
                    </IconButton>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
      );
    });

  const associateToken = async () => {
    setBackdropOpen(true);
    try {
      let associateTx = await new TokenAssociateTransaction()
        .setAccountId(props.accountId)
        .setTokenIds([tokenIdRef.current?.value])
        .freezeWith(props.client)
        .sign(sigKey);

      let associateTxSubmit = await associateTx.execute(props.client);
      await associateTxSubmit.getReceipt(props.client);
      setSnackbar({
        message: "Associate token success!",
        severity: "success",
        open: true,
      });
      setAssociateModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to associate token " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  return (
    <div>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1000 }}
        open={backdropOpen}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        autoHideDuration={3000}
        open={snackbar.open}
        severity={snackbar.severity}
        onClose={() =>
          setSnackbar({
            open: false,
            message: snackbar.message,
            severity: snackbar.severity,
          })
        }
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Typography gutterBottom variant="h5" component="div">
        <CurrencyExchange fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>Standard Bank Common Monetary Area</b>{" "}
        <Button
          variant="outlined"
          component="label"
          startIcon={<Add />}
          size="small"
          onClick={() => setAddAccountModalOpen(true)}
        >
          Add Account
        </Button>{" "}
        <Button
          variant="outlined"
          component="label"
          startIcon={<Link />}
          size="small"
          onClick={() => setAssociateModalOpen(true)}
        >
          Associate Token
        </Button>{" "}
        <Button
          variant="outlined"
          component="label"
          startIcon={<Delete />}
          color="error"
          size="small"
          style={{ float: "right" }}
          onClick={() => deleteAccount()}
        >
          Delete Account
        </Button>{" "}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Account ID:</b>{" "}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={
                    "https://hashscan.io/testnet/account/" + props.accountId
                  }
                >
                  {props.accountId}
                </a>
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Public Key:</b> {props.publicKey}
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>EVM address:</b> {accountInfo.evm_address}
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Hbar:</b> {hbarBalance}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid
          item
          xs={12}
          style={{ textAlign: "center", display: loading ? "block" : "none" }}
        >
          <CircularProgress />
        </Grid>
        {tokenList}
      </Grid>
      <Modal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <b>Token:</b> {selectedToken.token_id?.toString()} (
              {tokenInfo[
                selectedToken.token_id?.toString()
              ]?.symbol?.toString()}
              )
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="AccountID"
                name="AccountID"
                label="Reciever's AccountID"
                fullWidth
                variant="standard"
                inputRef={accountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="Amount"
                name="Amount"
                label="Amount"
                fullWidth
                variant="standard"
                inputRef={amountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={transferToken}
              >
                Send
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setTransferModalOpen(false)}
              >
                Close
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
      <Modal
        open={associateModalOpen}
        onClose={() => setAssociateModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="TokenID"
                name="TokenID"
                label="TokenID to be associated"
                fullWidth
                variant="standard"
                inputRef={tokenIdRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={associateToken}
              >
                Link
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setAssociateModalOpen(false)}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
      <Modal
        open={addAccountModalOpen}
        onClose={() => setAddAccountModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="AccountId"
                name="AccountId"
                label="Account ID"
                fullWidth
                variant="standard"
                inputRef={accountIdRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="AccountPrivateKey"
                name="AccountPrivateKey"
                label="Account Private Key"
                fullWidth
                variant="standard"
                inputRef={accountPrivateKeyRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="AccountName"
                name="AccountName"
                label="Account Name"
                fullWidth
                variant="standard"
                inputRef={accountNameRef}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={() => {
                  addAccount();
                }}
              >
                Add
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setAddAccountModalOpen(false)}
              >
                Close
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
      <Modal
        open={mintModalOpen}
        onClose={() => setMintModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="MintAmount"
                name="MintAmount"
                label="Token amount to be minted"
                fullWidth
                variant="standard"
                inputRef={mintAmountRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Money />}
                color="secondary"
                onClick={mintToken}
              >
                Mint
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setMintModalOpen(false)}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
    </div>
  );
};

export default Home;
