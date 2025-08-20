import { Box, Chip, Card, CardContent, CardActionArea } from "@mui/material";
import { useEffect, useState } from "react";

const Sidebar = (props) => {
  const [txList, setTxList] = useState();

  useEffect(() => {
    const fetchTransactions = async () => {
      const txs = await props.api.getTransactionsByAccountId(
        props.account.accountId
      );
      const txList = txs.data.transactions.map((tx) => {
        return (
          <Box key={tx.transaction_hash} mt={1}>
            <Card>
              <CardActionArea>
                <CardContent>
                  <Chip
                    size="small"
                    label={tx.name}
                    color="primary"
                    variant="outlined"
                  />{" "}
                  <Chip
                    size="small"
                    ml={1}
                    label={tx.result}
                    color="info"
                    variant="outlined"
                  />
                  <Box mt={1}>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://hashscan.io/testnet/transaction/${tx.consensus_timestamp}`}
                    >
                      {tx.transaction_id}
                    </a>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        );
      });
      setTxList(txList);
    };
    fetchTransactions();
    const scheduler = setInterval(fetchTransactions, 3000);
    return () => {
      clearInterval(scheduler);
    };
  }, [props.account, props.api]);

  return (
    <Box
      flex={2}
      pt={2}
      pb={2}
      pl={2}
      sx={{ display: { xs: "none", sm: "block" } }}
      style={{ minWidth: "300px" }}
    >
      <Box>
        <div>
          <b>Recent Transactions</b>
        </div>
        <div>{txList}</div>
      </Box>
    </Box>
  );
};

export default Sidebar;
