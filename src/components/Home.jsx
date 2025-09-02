import { useState, useEffect, useRef } from "react";
import Card from "@mui/material/Card";
import { ethers } from "ethers";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  AccountBalanceQuery,
  PrivateKey,
  TokenAssociateTransaction,
  TransferTransaction,
} from "@hashgraph/sdk";
import {
  Close,
  CurrencyExchange,
  Delete,
  Link,
  Add,
  Savings,
  Send,
  AttachMoney,
  Money,
} from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Button,
  CircularProgress,
  Grid,
  Modal,
  Snackbar,
  TextField,
  Autocomplete,
} from "@mui/material";
import { Box } from "@mui/system";
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

const Home = (props) => {
  const mirrorNodeDelay = 5000;
  const [hbarBalance, setHbarBalance] = useState("0");
  const [tokens, setTokens] = useState([]);
  const [tokenInfo, setTokenInfo] = useState({});
  const [accountInfo, setAccountInfo] = useState({});
  const [selectedToken, setSelectedToken] = useState({});
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [burnModalOpen, setBurnModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [sigKey, setSigKey] = useState();
  const [receiverOption, setReceiverOption] = useState([]);
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });
  const explorer_url = process.env.REACT_APP_EXPLORER;

  const TokenContractABI = [
    "function mint(address,int64) external returns (bool)",
    "function burn(int64) external returns (bool)",
  ];

  const accountRef = useRef();
  const amountRef = useRef();

  const accountNameRef = useRef();
  const accountIdRef = useRef();
  const accountPrivateKeyRef = useRef();
  const localCurrencyRef = useRef();
  const fxRateRef = useRef();

  const tokenIdRef = useRef();
  const depositAmountRef = useRef();
  const transferMemoRef = useRef();

  useEffect(() => {
    setTokens([]);
    const fetchAccount = async () => {
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(props.account.accountId)
        .execute(props.client);
      setHbarBalance(accountBalance.hbars.toString());
      const resp = await props.api.getAccount(props.account.accountId);
      const account = resp.data;
      const tokens = account.balance.tokens;
      let tokenRelationships = [];
      let tokenInfo = {};

      setLoading(true);
      for (const token of tokens) {
        let query = await props.api.getToken(token.token_id);
        query.data.balance = token.balance;
        tokenInfo[token.token_id] = query.data;
        tokenRelationships.push(token);
      }
      setTokenInfo(tokenInfo);
      setTokens(tokenRelationships);
      setLoading(false);
      setAccountInfo(account);
    };
    let options = [];
    props.accounts.forEach((acc) => {
      if (acc.accountId !== props.account.accountId) {
        options.push({
          label: acc.name,
          id: acc.accountId,
        });
      }
    });
    setReceiverOption(options);
    fetchAccount();
    setSigKey(PrivateKey.fromStringECDSA(props.privateKey));
  }, [
    props.account,
    props.accounts,
    props.client,
    props.privateKey,
    props.api,
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
        localCurrency: localCurrencyRef.current?.value,
        fxRate: fxRateRef.current?.value,
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

  const depositToken = async () => {
    setBackdropOpen(true);
    try {
      const amount = parseInt(
        depositAmountRef.current?.value * props.account.fxRate
      );
      await mintToken(amount);
      setSnackbar({
        message: "Tokens minted successfully",
        severity: "success",
        open: true,
      });
      setDepositModalOpen(false);
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

  const burnToken = async () => {
    setBackdropOpen(true);
    try {
      const tokenContractAddress = await props.api.getTreasuryAddress(
        selectedToken.token_id
      );
      const amount = parseInt(amountRef.current?.value);
      const transaction = await new TransferTransaction()
        .addTokenTransfer(
          selectedToken.token_id,
          props.account.accountId,
          -amount
        )
        .addTokenTransfer(selectedToken.token_id, tokenContractAddress, amount)
        .freezeWith(props.client);
      const signTx = await transaction.sign(sigKey);
      const txResponse = await signTx.execute(props.client);
      await txResponse.getReceipt(props.client);
      const provider = new ethers.JsonRpcProvider(
        process.env.REACT_APP_JSON_RPC_URL
      );
      await delay(mirrorNodeDelay);
      const wallet = new ethers.Wallet(
        PrivateKey.fromStringECDSA(props.privateKey).toStringRaw(),
        provider
      );
      const contract = new ethers.Contract(
        tokenContractAddress,
        TokenContractABI,
        wallet
      );
      const tx = await contract.burn(amount, {
        gasPrice: 710000000000,
        gasLimit: 1000000,
      });
      console.log(`Tx sent: ${tx.hash}`);
      const rcpt = await tx.wait();
      console.log(`Confirmed in block: ${rcpt.blockNumber}`);
      setBurnModalOpen(false);
      setRefreshCount(refreshCount + 1);
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to withdraw token " + err.toString(),
        severity: "error",
        open: true,
      });
      setBurnModalOpen(false);
      setRefreshCount(refreshCount + 1);
    }
    setBackdropOpen(false);
  };

  const transferToken = async () => {
    setBackdropOpen(true);
    try {
      const amount = parseInt(amountRef.current?.value);
      let receiverAccount = accountRef.current?.value;
      receiverOption.forEach((acc) => {
        if (receiverAccount === acc.label) receiverAccount = acc.id;
      });

      const transaction = await new TransferTransaction()
        .addTokenTransfer(
          selectedToken.token_id,
          props.account.accountId,
          -amount
        )
        .addTokenTransfer(selectedToken.token_id, receiverAccount, amount)
        .setTransactionMemo(transferMemoRef.current?.value)
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
      setRefreshCount(refreshCount + 1);
    }
    setBackdropOpen(false);
  };

  const mintToken = async (amount) => {
    console.log("MintToken");
    const tokenContractAddress = await props.api.getTreasuryAddress(
      selectedToken.token_id
    );
    console.log("TokenContractAddress", tokenContractAddress);
    const provider = new ethers.JsonRpcProvider(
      process.env.REACT_APP_JSON_RPC_URL
    );

    const wallet = new ethers.Wallet(
      PrivateKey.fromStringECDSA(props.privateKey).toStringRaw(),
      provider
    );
    const contract = new ethers.Contract(
      tokenContractAddress,
      TokenContractABI,
      wallet
    );
    const tx = await contract.mint(accountInfo.evm_address, amount, {
      gasPrice: 710000000000,
      gasLimit: 1000000,
    });
    console.log(`Tx sent: ${tx.hash}`);
    const rcpt = await tx.wait();
    console.log(`Confirmed in block: ${rcpt.blockNumber}`);
  };

  const tokenList = tokens
    .filter((token) => tokenInfo[token.token_id].type === "FUNGIBLE_COMMON")
    .map((token) => {
      return (
        <Grid item xs={12} key={token.token_id.toString()}>
          <Card sx={{ minWidth: 150 }}>
            <CardContent>
              <div>
                <b>
                  {tokenInfo[token.token_id.toString()]?.name?.toString()}
                  {" ( "}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={explorer_url + "/token/" + token.token_id.toString()}
                  >
                    {token.token_id.toString()}
                  </a>
                  {" )"}
                </b>{" "}
                <Button
                  variant="text"
                  component="label"
                  size="small"
                  startIcon={<Send />}
                  color="info"
                  onClick={() => {
                    setTransferModalOpen(true);
                    setSelectedToken(token);
                  }}
                  style={{ float: "right" }}
                >
                  Transfer
                </Button>{" "}
                <br />
                <b>Balance:</b>{" "}
                <h1 style={{ textAlign: "center", fontSize: "50px" }}>
                  {tokenInfo[
                    token.token_id.toString()
                  ]?.balance?.toLocaleString()}
                </h1>
              </div>

              <div>
                <Button
                  variant="text"
                  component="label"
                  size="small"
                  color="success"
                  startIcon={<Savings />}
                  onClick={() => {
                    setDepositModalOpen(true);
                    setSelectedToken(token);
                  }}
                >
                  Debit
                </Button>{" "}
                <Button
                  variant="text"
                  component="label"
                  size="small"
                  startIcon={<AttachMoney />}
                  color="error"
                  onClick={() => {
                    setBurnModalOpen(true);
                    setSelectedToken(token);
                  }}
                  style={{ float: "right" }}
                >
                  Withdraw
                </Button>
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
        .setAccountId(props.account.accountId)
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
        <b style={{ marginLeft: "5px" }}>International Remittance</b>{" "}
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
                  href={explorer_url + "/account/" + props.account.accountId}
                >
                  {props.account.accountId}
                </a>
                {"(Treasury Account)"}
                <b style={{ float: "right" }}>{hbarBalance}</b>
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Local Currency:</b> {props.account.localCurrency}
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              >
                <b>Fx Rate:</b> {props.account.fxRate}
              </Typography>
              <Typography
                sx={{ fontSize: 16 }}
                color="text.secondary"
                gutterBottom
              ></Typography>
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
              <Autocomplete
                options={receiverOption}
                renderInput={(options) => (
                  <TextField
                    {...options}
                    id="AccountID"
                    name="AccountID"
                    label="Recipient Bank"
                    value={options.accountId}
                    fullWidth
                    variant="standard"
                    inputRef={accountRef}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="RecipientAccount"
                name="RecipientAccount"
                label="Recipient Account"
                fullWidth
                variant="standard"
                inputRef={transferMemoRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="Amount"
                name="Amount"
                label="Token Amount"
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
        open={burnModalOpen}
        onClose={() => setBurnModalOpen(false)}
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
                id="Amount"
                name="Amount"
                label="Token amount to be burned"
                fullWidth
                variant="standard"
                inputRef={amountRef}
                onChange={(e) =>
                  setCalculatedAmount(e.target.value / props.account.fxRate)
                }
              />
              {"Fiat amount to be withdrawn: " + calculatedAmount.toFixed(2)}
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={burnToken}
              >
                Withdraw
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setBurnModalOpen(false)}
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
              <TextField
                id="LocalCurrency"
                name="LocalCurrency"
                label="Local Currency"
                fullWidth
                variant="standard"
                inputRef={localCurrencyRef}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="FX Rate"
                name="FX Rate"
                label="FxRate"
                fullWidth
                variant="standard"
                inputRef={fxRateRef}
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
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="DepositAmount"
                name="MintAmount"
                label="Fiat amount to be debited"
                fullWidth
                variant="standard"
                onChange={(e) =>
                  setCalculatedAmount(e.target.value * props.account.fxRate)
                }
                inputRef={depositAmountRef}
              />
              {"Token to be minted: " + calculatedAmount}
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Money />}
                color="secondary"
                onClick={depositToken}
              >
                Debit
              </Button>
              <Button
                variant="contained"
                component="label"
                startIcon={<Close />}
                color="error"
                style={{ float: "right" }}
                onClick={() => setDepositModalOpen(false)}
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
