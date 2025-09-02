import {
  AppBar,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Toolbar,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import InputBase from "@mui/material/InputBase";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import { styled, alpha } from "@mui/material/styles";
import React, { useRef } from "react";
import { NavLink } from "react-router-dom";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      width: "30ch",
      "&:focus": {
        width: "30ch",
      },
    },
  },
}));

const Navbar = (props) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const searchRef = useRef();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
    console.log(mobileOpen);
  };

  const handleAccountChange = (e) => {
    props.accounts.forEach((account) => {
      if (e.target.value === account.accountId) {
        props.changeAccount(account);
      }
    });
  };

  const openLink = (url) => {
    window.open(url, "_blank", "noopener");
  };

  const handleSearch = async (e) => {
    if (e.key === "Enter") {
      let query = searchRef.current?.value;
      let queryArray = query.split("@");
      let resp;

      if (queryArray.length === 1) {
        resp = await props.api.getAccount(query);
        if (resp.status === 200) {
          openLink(process.env.REACT_APP_EXPLORER + `/account/${query}`);
          return;
        }

        resp = await props.api.getToken(query);
        if (resp.status === 200) {
          openLink(process.env.REACT_APP_EXPLORER + `/token/${query}`);
          return;
        }

        resp = await props.api.getTopic(query);
        if (resp.status === 200) {
          openLink(process.env.REACT_APP_EXPLORER + `/topic/${query}`);
          return;
        }

        resp = await props.api.getContract(query);
        if (resp.status === 200) {
          openLink(process.env.REACT_APP_EXPLORER + `/contract/${query}`);
          return;
        }
      }

      if (queryArray.length > 1) {
        queryArray[1] = queryArray[1].replace(".", "-");
        query = `${queryArray[0]}-${queryArray[1]}`;
      }

      resp = await props.api.getTransaction(query);
      if (resp.status === 200) {
        openLink(process.env.REACT_APP_EXPLORER + `/transaction/${query}`);
        return;
      }
    }
  };

  const accountList = props.accounts.map((account, index) => {
    return (
      <MenuItem key={account.accountId} value={account.accountId}>
        {`[${account.name}] - ${account.accountId}`}
      </MenuItem>
    );
  });

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <img
            style={{ height: "64px" }}
            alt="Logo"
            src={process.env.PUBLIC_URL + "/favicon.png"}
          />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}
            style={{ marginLeft: 10 }}
          >
            <NavLink
              style={{ color: "inherit", textDecoration: "inherit" }}
              to="/"
            >
              International Remittance PoC
            </NavLink>
          </Typography>
          <b>Account ID:</b>{" "}
          <FormControl sx={{ m: 1, minWidth: 80 }}>
            <Select
              autoWidth
              value={props.accountId}
              style={{ color: "white" }}
              onChange={handleAccountChange}
            >
              {accountList}
            </Select>
          </FormControl>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search…"
              inputProps={{ "aria-label": "search" }}
              onKeyDown={handleSearch}
              inputRef={searchRef}
            />
          </Search>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Navbar;
