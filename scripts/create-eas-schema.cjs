const { SchemaRegistry } = require('@ethereum-attestation-service/eas-sdk');
const { ethers } = require('ethers');

const schema =
  process.env.EAS_SCHEMA_STRING ||
  'string agentId,string name,string presetId,string tier,bytes32 promptHash,bytes32 manifestHash,string parentId,string ownerId,uint64 createdAt';

const rpcUrl = process.env.EAS_RPC_URL;
const privateKey = process.env.EAS_SIGNER_PRIVATE_KEY;
const chainId = Number(process.env.EAS_CHAIN_ID || 8453);
const registryAddress =
  process.env.EAS_SCHEMA_REGISTRY_ADDRESS ||
  '0x4200000000000000000000000000000000000020';

if (!rpcUrl) {
  console.error('EAS_RPC_URL is required.');
  process.exit(1);
}
if (!privateKey) {
  console.error('EAS_SIGNER_PRIVATE_KEY is required.');
  process.exit(1);
}

const run = async () => {
  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const signer = new ethers.Wallet(privateKey, provider);
  const registry = new SchemaRegistry(registryAddress);
  registry.connect(signer);

  console.log('Signer:', signer.address);
  console.log('Registry:', registryAddress);
  console.log('Schema:', schema);

  const transaction = await registry.register({
    schema,
    resolverAddress: ethers.ZeroAddress,
    revocable: false,
  });

  const txResponse = await signer.sendTransaction(transaction.data);
  console.log('Tx hash:', txResponse.hash);
  await txResponse.wait();

  const uid = SchemaRegistry.getSchemaUID(
    schema,
    ethers.ZeroAddress,
    false,
  );
  console.log('Schema UID:', uid);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
