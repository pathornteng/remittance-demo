import { Stack } from "@mui/material";
import { Box } from "@mui/system";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import SignIn from "./components/SignIn";
import CssBaseline from "@mui/material/CssBaseline";
import { Routes, Route } from "react-router-dom";
import { Client } from "@hashgraph/sdk";
import { useEffect, useState } from "react";
import Home from "./components/Home";
import MirrorNodeAPI from "./api/mirror-node-api";
import "./App.css";

const App = () => {
  const [account, setAccount] = useState();
  const [accounts, setAccounts] = useState();
  const client = Client.forTestnet();
  const api = new MirrorNodeAPI();

  useEffect(() => {
    if (account) client.setOperator(account.accountId, account.privateKey);
  }, [account, accounts, client]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    const currentAccount = JSON.parse(localStorage.getItem("currentAccount"));
    if (currentAccount) {
      setAccount(currentAccount);
      setAccounts([currentAccount]);
    }

    const localAccounts = JSON.parse(localStorage.getItem("accounts"));
    if (localAccounts) setAccounts(localAccounts);
  };

  const changeAccount = (account) => {
    setAccount(account);
    if (account) {
      localStorage.setItem("currentAccount", JSON.stringify(account));
    } else {
      localStorage.removeItem("currentAccount");
    }
  };

  const signIn = (account) => {
    localStorage.setItem("currentAccount", JSON.stringify(account));
    localStorage.setItem("accounts", JSON.stringify([account]));
    setAccount(account);
    setAccounts([account]);
  };

  const renderApp = () => {
    if (account) {
      return (
        <Box>
          <Navbar
            accountId={account.accountId}
            accounts={accounts}
            changeAccount={changeAccount}
            api={api}
          />
          <CssBaseline />
          <Stack direction="row" spacing={2}>
            <Sidebar account={account} api={api} />
            <Box flex={10} pr={2} pt={2} pb={2}>
              <Routes>
                <Route
                  path="/"
                  fungi
                  element={
                    <Home
                      accountId={account.accountId}
                      account={account}
                      accounts={accounts}
                      privateKey={account.privateKey}
                      publicKey={account.publicKey}
                      setAccounts={setAccounts}
                      changeAccount={changeAccount}
                      client={client}
                    />
                  }
                />
              </Routes>
            </Box>
          </Stack>
        </Box>
      );
    } else {
      return <SignIn signIn={signIn} api={api} />;
    }
  };

  return renderApp();
};

export default App;
