import "./App.css";
import { useState, useEffect, useCallback } from "react";
import { create as ipfsHttpClient } from "ipfs-http-client";
import { ethers } from "ethers";
import SoulboundABI from "./SoulboundABI.json"

// if env is not working then directly put the Infura Id and Key
const projectId = "2JwnITRYL8qxpSsA0lp5yXRGk8m";
const projectSecretKey = "ad81c7eb6e7578e078eaed4994f5f2f6";
const authorization = "Basic " + btoa(projectId + ":" + projectSecretKey);

function App() {
    let contractAddress = "0x76FbB587bfeb130A61AEa168A431502Fd0032b82";

    const [uploadedImages, setUploadedImages] = useState([]);

    let [blockchainProvider, setBlockchainProvider] = useState(undefined);
    let [metamask, setMetamask] = useState(undefined);
    let [metamaskNetwork, setMetamaskNetwork] = useState(undefined);
    let [metamaskSigner, setMetamaskSigner] = useState(undefined);
    const [networkId, setNetworkId] = useState(undefined);
    const [loggedInAccount, setAccounts] = useState(undefined);
    const [etherBalance, setEtherBalance] = useState(undefined);
    const [isError, setError] = useState(false);

    const [contract, setReadContract] = useState(null);
    const [writeContract, setWriteContract] = useState(null);

    const [address, setAddress] = useState(null);

    const connect = async () => {
        try {
            let provider, network, metamaskProvider, signer, accounts;

            if (typeof window.ethereum !== 'undefined') {
                // Connect to RPC  
                console.log('loadNetwork')
                try {

                    //console.log("acc", acc); 
                    //window.ethereum.enable();
                    //await handleAccountsChanged();
                    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    await handleAccountsChanged(accounts);
                } catch (err) {
                    if (err.code === 4001) {
                        // EIP-1193 userRejectedRequest error
                        // If this happens, the user rejected the connection request.
                        console.log('Please connect to MetaMask.');
                    } else {
                        console.error(err);
                    }
                }
                provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/c811f30d8ce746e5a9f6eb173940e98a`)
                //const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545")
                setBlockchainProvider(provider);
                network = await provider.getNetwork()
                console.log(network.chainId);
                setNetworkId(network.chainId);

                // Connect to Metamask  
                metamaskProvider = new ethers.providers.Web3Provider(window.ethereum)
                setMetamask(metamaskProvider)

                signer = await metamaskProvider.getSigner(accounts[0])
                setMetamaskSigner(signer)

                metamaskNetwork = await metamaskProvider.getNetwork();
                setMetamaskNetwork(metamaskNetwork.chainId);

                console.log(network);

                if (network.chainId !== metamaskNetwork.chainId) {
                    alert("Your Metamask wallet is not connected to " + network.name);

                    setError("Metamask not connected to RPC network");
                }

                let tempContract = new ethers.Contract(contractAddress, SoulboundABI, provider);
                setReadContract(tempContract); //contract
                let tempContract2 = new ethers.Contract(contractAddress, SoulboundABI, signer);
                setWriteContract(tempContract2); //writeContract

            } else setError("Could not connect to any blockchain!!");

            return {
                provider, metamaskProvider, signer,
                network: network.chainId
            }

        } catch (e) {
            console.error(e);
            setError(e);
        }

    }
    const handleAccountsChanged = async (accounts) => {
        if (typeof accounts !== "string" || accounts.length < 1) {
            accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        }
        console.log("t1", accounts);
        if (accounts.length === 0) {
            // MetaMask is locked or the user has not connected any accounts
            alert('Please connect to MetaMask.');
        } else if (accounts[0] !== loggedInAccount) {
            setAccounts(accounts[0]);
        }
    }

    useEffect(() => {
        const init = async () => {

            const { provider, metamaskProvider, signer, network } = await connect();

            const accounts = await metamaskProvider.listAccounts();
            console.log(accounts[0]);
            setAccounts(accounts[0]);

            if (typeof accounts[0] == "string") {
                setEtherBalance(ethers.utils.formatEther(
                    Number(await metamaskProvider.getBalance(accounts[0])).toString()
                ));
            }
        }

        init();

        window.ethereum.on('accountsChanged', handleAccountsChanged);

        window.ethereum.on('chainChanged', function (networkId) {
            // Time to reload your interface with the new networkId
            //window.location.reload();
            unsetStates();
        })

    }, []);

    useEffect(() => {
        (async () => {
            if (typeof metamask == 'object' && typeof metamask.getBalance == 'function'
                && typeof loggedInAccount == "string") {
                setEtherBalance(ethers.utils.formatEther(
                    Number(await metamask.getBalance(loggedInAccount)).toString()
                ));

            }
        })()
    }, [loggedInAccount]);

    const unsetStates = useCallback(() => {
        setBlockchainProvider(undefined);
        setMetamask(undefined);
        setMetamaskNetwork(undefined);
        setMetamaskSigner(undefined);
        setNetworkId(undefined);
        setAccounts(undefined);
        setEtherBalance(undefined);
    }, []);

    const isReady = useCallback(() => {

        return (
            typeof blockchainProvider !== 'undefined'
            && typeof metamask !== 'undefined'
            && typeof metamaskNetwork !== 'undefined'
            && typeof metamaskSigner !== 'undefined'
            && typeof networkId !== 'undefined'
            && typeof loggedInAccount !== 'undefined'
        );
    }, [
        blockchainProvider,
        metamask,
        metamaskNetwork,
        metamaskSigner,
        networkId,
        loggedInAccount,
    ]);

    const ipfs = ipfsHttpClient({
        url: "https://ipfs.infura.io:5001/api/v0",
        headers: {
            authorization,
        },
    });
    const onSubmitHandler = async (event) => {
        event.preventDefault();
        const form = event.target;
        const files = form[0].files;

        if (!files || files.length === 0) {
            return alert("No files selected");
        }

        const file = files[0];
        // upload files
        const result = await ipfs.add(file);
        const completePath = `https://infura-ipfs.io/ipfs/${result.path}`

        await writeContract.safeMint(address, completePath)

        setUploadedImages([
            ...uploadedImages,
            {
                cid: result.cid,
                path: result.path,
            },
        ]);

        form.reset();
    };

    return (
        <div className="app">
            <div className="app__container">
                {ipfs ? (
                    <div className="container">
                        <h1>IPFS uploader</h1>
                        <form onSubmit={onSubmitHandler}>
                            <label for="file-upload" class="custom-file-upload">
                                Select File
                            </label>
                            <input id="file-upload" type="file" name="file" />
                            <input id='serAddr' value={address} onChange={(event) => setAddress(event.target.value)} type='text' placeholder="Address" />
                            <button className="button" type="submit" >
                                Upload file
                            </button>
                        </form>
                    </div>
                ) : null}
                <div className="data">
                    {uploadedImages.map((image, index) => (
                        <>
                            <img
                                className="image"
                                alt={`Uploaded #${index + 1}`}
                                src={"https://infura-ipfs.io/ipfs/" + image.path}
                                style={{ maxWidth: "400px", margin: "15px" }}
                                key={image.cid.toString() + index}
                            />
                            <h4>Link to IPFS:</h4>
                            <a href={"https://infura-ipfs.io/ipfs/" + image.path}>
                                <h3>{"https://infura-ipfs.io/ipfs/" + image.path}</h3>
                            </a>
                        </>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;