import { useMemo, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  Autocomplete,
  TextField,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  AssetId,
  assets,
  theme,
  getAssetInfo,
  AssetInfo,
  AssetIcon,
} from "@fireblocks/recovery-shared";
import { BaseModal } from "../BaseModal";
import { getRelayUrl } from "../../../lib/relayUrl";
import { useSettings } from "../../../context/Settings";
import { useWorkspace, VaultAccount } from "../../../context/Workspace";
import { VaultAccountIcon } from "../../Icons";
import { QrCode } from "../../QrCode";

type Props = {
  assetId?: AssetId;
  accountId?: number;
  open: boolean;
  onClose: VoidFunction;
};

export const WithdrawModal = ({ assetId, accountId, open, onClose }: Props) => {
  const { relayBaseUrl } = useSettings();

  const { extendedKeys, asset, vaultAccounts } = useWorkspace();

  const resolvedAssetId = assetId ?? asset?.id;

  const vaultAccountsArray = useMemo(
    () => Array.from(vaultAccounts.values()),
    [vaultAccounts]
  );

  const [account, setAccount] = useState<VaultAccount | undefined>(() =>
    typeof accountId === "number" ? vaultAccounts.get(accountId) : undefined
  );

  const onChangeAccount = (newAccount: VaultAccount | null) =>
    setAccount(newAccount ?? undefined);

  const [resolvedAsset, setAsset] = useState<AssetInfo | undefined>(
    resolvedAssetId ? getAssetInfo(resolvedAssetId) : undefined
  );

  const onChangeAsset = (newAsset: AssetInfo | null) =>
    setAsset(newAsset ?? undefined);

  const relayUrl = useMemo(() => {
    if (!resolvedAsset || !extendedKeys || typeof account?.id !== "number") {
      return "";
    }

    return getRelayUrl({
      baseUrl: relayBaseUrl,
      data: {
        ...extendedKeys,
        assetId: resolvedAsset.id,
        accountId: account.id,
      },
    });
  }, [resolvedAsset, extendedKeys, account, relayBaseUrl]);

  return (
    <BaseModal open={open} onClose={onClose} title="New Withdrawal">
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                id="assetId"
                autoComplete
                // autoSelect
                // blurOnSelect
                // includeInputInList
                value={(asset ?? { id: "" }) as AssetInfo}
                options={assets}
                getOptionLabel={(option) => option.id}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField {...params} fullWidth label="Asset" />
                )}
                renderOption={(props, option, { selected }) => (
                  <ListItemButton
                    selected={selected}
                    dense
                    divider
                    onClick={() => onChangeAsset(option)}
                    sx={{ transition: "none" }}
                  >
                    <ListItemIcon>
                      <Box
                        width={40}
                        height={40}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius={40}
                        border={(_theme) =>
                          `solid 1px ${_theme.palette.grey[300]}`
                        }
                        sx={{ background: "#FFF" }}
                      >
                        <AssetIcon assetId={option.id} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ variant: "h2" }}
                      primary={option.id}
                      secondary={option.name}
                    />
                  </ListItemButton>
                )}
                onChange={(_, newAsset) => onChangeAsset(newAsset)}
                sx={{ width: 300 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                id="accountId"
                autoComplete
                // autoSelect
                // blurOnSelect
                // includeInputInList
                value={(account ?? { name: "" }) as VaultAccount}
                options={vaultAccountsArray}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField {...params} fullWidth label="From" />
                )}
                renderOption={(props, option, { selected }) => (
                  <ListItemButton
                    selected={selected}
                    dense
                    divider
                    onClick={() => onChangeAccount(option)}
                    sx={{ transition: "none" }}
                  >
                    <ListItemIcon>
                      <Box
                        width={40}
                        height={40}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius={40}
                        border={(_theme) =>
                          `solid 1px ${_theme.palette.grey[300]}`
                        }
                        sx={{ background: "#FFF" }}
                      >
                        <VaultAccountIcon />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ variant: "h2" }}
                      primary={option.id}
                      secondary={option.name}
                    />
                  </ListItemButton>
                )}
                onChange={(_, newAccount) => onChangeAccount(newAccount)}
                sx={{ width: 300 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1" paragraph>
                Scan the QR code with an online device to send a transaction
                with Fireblocks Recovery Relay. Use the PIN to decrypt the{" "}
                {asset?.name} private key.
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <QrCode
              data={relayUrl}
              title="Open with an online device"
              bgColor={theme.palette.background.default}
            />
          </Box>
        </Grid>
      </Grid>
    </BaseModal>
  );
};
