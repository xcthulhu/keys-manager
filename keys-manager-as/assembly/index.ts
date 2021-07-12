//@ts-nocheck
import {PublicKey} from "casper-contract/public_key";
import {getNamedArg, 
        EntryPoint,
        EntryPoints,
        PublicAccess,
        EntryPointType,
        putKey,
        newLockedContract} from "casper-contract/index";
import {Key,AccountHash} from "casper-contract/key";
import {CLType, CLTypeTag} from "casper-contract/clvalue";
import{Error,ErrorCode} from "casper-contract/error";
import{fromBytesLoad} from "casper-contract/bytesrepr";
import{Error as CustomError} from "./error";
import{Pair} from "casper-contract/pair";
import {setActionThreshold,
        SetThresholdFailure,
        updateAssociatedKey,
        UpdateKeyFailure,
        addAssociatedKey,
        AddKeyFailure,
        removeAssociatedKey,
        RemoveKeyFailure,
        ActionType
    } from "casper-contract/account";

const ARG_ACCOUNT: string = "account";
const ARG_WEIGHT: string = "weight";
const ARG_ACCOUNTS: string= "accounts";
const ARG_WEIGHTS: string = "weights";
const ARG_DEPLOYMENT_THRESHOLD: string = "deployment_thereshold";
const ARG_KEY_MANAGEMENT_THRESHOLD: string = "key_management_threshold";

export function setKeyWeight():void {
    let keyResult = PublicKey.fromBytes(getNamedArg(ARG_ACCOUNT));
    if(keyResult.hasValue()){
        let key = <PublicKey>keyResult.value;
        let accountHash = AccountHash.fromPublicKey(key);
        let weightResult = fromBytesLoad<u8>(getNamedArg(ARG_WEIGHT)); 
        if(weightResult.hasValue()) {
            let weight =weightResult.value;
            updateKeyWeight(accountHash,weight);
        } else{
            Error.fromErrorCode(ErrorCode.Deserialize); // <---Appropriate error???
        }
    } else{
        Error.fromErrorCode(ErrorCode.Deserialize); // <---Appropriate error???
    }
}

export function setDeploymentThreshold() :void {
    let thresholdResult = fromBytesLoad<u8>(getNamedArg(ARG_WEIGHT));
    if(thresholdResult.hasValue()){
        let threshold =  thresholdResult.value;
        setThreshold(ActionType.Deployment, threshold); //Reverts inside function if error
    } else{
        Error.fromErrorCode(ErrorCode.Deserialize); // <---Appropriate error???
    }
}

export function call() :void {
    let entry_points =  new EntryPoints();
    let args1 = new Array<Pair<String, CLType>>();
    args1.push(new Pair (ARG_ACCOUNT,new CLType(CLTypeTag.PublicKey,null)));
    args1.push(new Pair(ARG_WEIGHT, new CLType(CLTypeTag.U8,null)));
    let ep1 = new EntryPoint("set_key_weight",args1, new CLType(CLTypeTag.Unit),new PublicAccess(),EntryPointType.Session);
    entry_points.addEntryPoint(ep1);
    
    let args2 = new Array<Pair<String, CLType>>();
    args2.push(new Pair (ARG_WEIGHT,new CLType(CLTypeTag.U8,null)));
    let ep2 = new EntryPoint("set_deployment_threshold",args2, new CLType(CLTypeTag.Unit),new PublicAccess(),EntryPointType.Session);
    entry_points.addEntryPoint(ep2);
   
    let args3 = new Array<Pair<String, CLType>>();
    args3.push(new Pair (ARG_WEIGHT,new CLType(CLTypeTag.U8,null)));
    let ep3 = new EntryPoint("set_key_management_threshold",args3, new CLType(CLTypeTag.Unit,null),new PublicAccess(),EntryPointType.Session);
    entry_points.addEntryPoint(ep3);
    
    let args4 = new Array<Pair<String, CLType>>();
    args4.push(new Pair (ARG_DEPLOYMENT_THRESHOLD, new CLType(CLTypeTag.U8,null)));
    args4.push(new Pair (ARG_KEY_MANAGEMENT_THRESHOLD,new CLType(CLTypeTag.U8,null)));
    args4.push(new Pair (ARG_ACCOUNTS,new CLType(CLTypeTag.PublicKey,null)));
    args4.push(new Pair (ARG_WEIGHTS,new CLType(CLTypeTag.U8,null)));
    let ep4 = new EntryPoint("set_all",args4, new CLType(CLTypeTag.Unit,null),new PublicAccess(),EntryPointType.Session);
    
    entry_points.addEntryPoint(ep4);
    let contract_hash = newLockedContract(entry_points, null, null, null).contractHash;
    putKey("keys_manager",  Key.fromHash(contract_hash));
}

function updateKeyWeight(account: AccountHash, weight: u8) :void {
    if (weight == 0) {
        removeKeyIfExists(account); //Reverts inside function if error
    } else {
        addOrUpdateKey(account, weight); //Reverts inside function if error
    }
}

function setThreshold(permission_level: ActionType, threshold: u8): void {
    let e = setActionThreshold(permission_level,threshold);
    switch(e){
        case SetThresholdFailure.KeyManagementThreshold:
            Error.fromUserError(<u16>CustomError.KeyManagementThresholdError).revert();
        case SetThresholdFailure.DeploymentThreshold:
            Error.fromUserError(<u16>CustomError.DeploymentThresholdError).revert()
        case  SetThresholdFailure.PermissionDeniedError:
            Error.fromUserError(<u16>CustomError.PermissionDenied).revert()
        case SetThresholdFailure.InsufficientTotalWeight:
            Error.fromUserError(<u16>CustomError.InsufficientTotalWeight).revert();
    }
}
   
function addOrUpdateKey(key: AccountHash, weight: u8) : void {
    let e = updateAssociatedKey(key,weight);
    switch(e){
        case UpdateKeyFailure.MissingKey:
            addKey(key,weight);
        case UpdateKeyFailure.PermissionDenied:
            Error.fromUserError(<u16>CustomError.PermissionDenied).revert();
        case UpdateKeyFailure.ThresholdViolation:
            Error.fromUserError(<u16>CustomError.ThresholdViolation).revert();
    }
}

function addKey(key: AccountHash, weight: u8) : void {
    let e = addAssociatedKey(key,weight);
    switch(e){
        case AddKeyFailure.MaxKeysLimit:
            Error.fromUserError(<u16>CustomError.MaxKeysLimit).revert();
        case AddKeyFailure.DuplicateKey:
            Error.fromUserError(<u16>CustomError.DuplicateKey).revert()
        case  AddKeyFailure.PermissionDenied:
            Error.fromUserError(<u16>CustomError.PermissionDenied).revert()
    }
}

function removeKeyIfExists(accountHash: AccountHash) : void {
    let e = removeAssociatedKey(accountHash);
    switch(e){
        case RemoveKeyFailure.PermissionDenied:
            Error.fromUserError(<u16>CustomError.PermissionDenied).revert();
        case  RemoveKeyFailure.ThresholdViolation:
            Error.fromUserError(<u16>CustomError.ThresholdViolation).revert();
    }
}