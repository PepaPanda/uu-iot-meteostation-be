import type { TypedRequest, Empty } from '../../../shared/types';
import type { Response } from 'express';
import { type CreateGatewayRequestDto, type ListGatewaysRequestDto, type UpdateGatewayRequestDto, type GatewayIdRequestParamsDto, toGetGatewayResponseDto, toListGatewaysResponseDto, toRotateGatewaySecretResponseDto, toGetGatewayHealthResponseDto } from './gateways.dto';

import { InternalServerError, NotFoundError } from '../../../shared/errors';

import { createGateway as createGatewayService, getGatewayById as getGatewayByIdService, listMatchingGatewaysWithPagination, updateGatewayByIdService, deleteGatewayByIdService, rotateGatewaySecretService, getGatewayHealthService } from './gateways.service';

export const createGateway = async (req: TypedRequest<CreateGatewayRequestDto>, res: Response) => {
    const gw = await createGatewayService(req.body);
    if(!gw) throw new InternalServerError();
    res.status(201).json({gateway: gw.gateway, secret: gw.gatewayToken});
};

export const listGateways = async (req: TypedRequest<ListGatewaysRequestDto>, res: Response) => {
    const { page, pageSize, search } = req.body;
    const {gateways, pagination} = await listMatchingGatewaysWithPagination(page, pageSize, search);
    res.json(toListGatewaysResponseDto(gateways, pagination));
};

export const getGateway = async (req: TypedRequest<Empty, GatewayIdRequestParamsDto>, res: Response) => {
    const gw = await getGatewayByIdService(parseInt(req.params.gatewayId));
    if(!gw) throw new NotFoundError('gateway not found');
    res.json(toGetGatewayResponseDto(gw));
};

export const updateGateway = async (req: TypedRequest<UpdateGatewayRequestDto, GatewayIdRequestParamsDto>, res: Response) => {
    const updatedGw = await updateGatewayByIdService(parseInt(req.params.gatewayId), req.body);
    if (!updatedGw) throw new NotFoundError('Gateway not found');
    res.json(toGetGatewayResponseDto(updatedGw));
};

export const deleteGateway = async (req: TypedRequest<Empty, GatewayIdRequestParamsDto>, res: Response) => {
    const deletedGw = await deleteGatewayByIdService(parseInt(req.params.gatewayId));
    if (!deletedGw) throw new NotFoundError('Gateway not found');
    res.status(204).send();
};

export const rotateGatewaySecret = async (req: TypedRequest<Empty, GatewayIdRequestParamsDto>, res: Response) => {
    const gatewayId = parseInt(req.params.gatewayId);
    const newSecret = await rotateGatewaySecretService(gatewayId);
    if (!newSecret) throw new NotFoundError('Gateway not found');
    res.json(toRotateGatewaySecretResponseDto(newSecret, gatewayId));
};

export const getGatewayHealthController = async (req: TypedRequest<unknown, GatewayIdRequestParamsDto>, res: Response) => {
    const gatewayHealth = await getGatewayHealthService(parseInt(req.params.gatewayId));
    if (!gatewayHealth) throw new NotFoundError('Gateway not found');
    res.json(toGetGatewayHealthResponseDto(gatewayHealth));
};