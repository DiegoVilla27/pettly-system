import {
  Controller,
  Inject,
  UseGuards,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  AuthGuard,
  type AuthenticatedRequest,
} from '../../../../../../shared/infrastructure/http/auth.guard';
import { DocumentErrors } from '../../../../../../shared/infrastructure/http/errors';
import * as R from '../dtos/requests/cart.requests';
import * as S from '../dtos/responses/cart.responses';
import { CartHttpMapper as M } from '../mappers/cart-http.mapper';
import {
  CART_USE_CASES,
  type CartUseCases,
} from '../../../../application/ports/in/cart-use-cases';
import { CartQuery } from '../../../../application/queries/cart.query';
import {
  CartCommand,
  PutCartItemCommand,
  RemoveCartItemCommand,
} from '../../../../application/commands/cart.commands';
@ApiTags('Cart')
@ApiBearerAuth('accessToken')
@DocumentErrors()
@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(@Inject(CART_USE_CASES) private readonly cart: CartUseCases) {}
  @Get('')
  @ApiOperation({
    operationId: 'getOwnCart',
    summary: 'Read the persistent own cart',
    description:
      'Active verified account; creates an empty cart on first read. One business/currency, at most 50 distinct variants, quantity 1–99. Current prices are advisory; no stock reserved.',
  })
  @ApiOkResponse({ type: S.CartResponseDto })
  @ZodSerializerDto(S.CartResponseDto)
  async getOwnCart(@Req() req: AuthenticatedRequest) {
    return M.detail(await this.cart.get(new CartQuery(req.principal.userId)));
  }
  @Put('items/:variantId')
  @ApiOperation({
    operationId: 'putOwnCartItem',
    summary: 'Set a cart line quantity',
    description:
      'Requires current cart version and currently purchasable variant. Absolute quantity; one seller/currency, no automatic cart replacement. Unknown request fields are rejected.',
  })
  @ApiOkResponse({ type: S.CartResponseDto })
  @ZodSerializerDto(S.CartResponseDto)
  async putOwnCartItem(
    @Param() p: R.CartItemParamsDto,
    @Body() d: R.PutCartItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.detail(
      await this.cart.put(
        new PutCartItemCommand(
          req.principal.userId,
          d.expectedVersion,
          p.variantId,
          d.quantity,
        ),
      ),
    );
  }
  @Delete('items/:variantId')
  @ApiOperation({
    operationId: 'removeOwnCartItem',
    summary: 'Remove a cart line',
    description:
      'Requires current version; unavailable items can be removed. Removing the last item resets seller and currency.',
  })
  @ApiOkResponse({ type: S.CartResponseDto })
  @ZodSerializerDto(S.CartResponseDto)
  async removeOwnCartItem(
    @Param() p: R.CartItemParamsDto,
    @Body() d: R.CartVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.detail(
      await this.cart.remove(
        new RemoveCartItemCommand(
          req.principal.userId,
          d.expectedVersion,
          p.variantId,
        ),
      ),
    );
  }
  @Delete('')
  @ApiOperation({
    operationId: 'clearOwnCart',
    summary: 'Clear the own cart',
    description:
      'Requires current version; releases no stock because adding items does not reserve any.',
  })
  @ApiOkResponse({ type: S.CartResponseDto })
  @ZodSerializerDto(S.CartResponseDto)
  async clearOwnCart(
    @Body() d: R.CartVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return M.detail(
      await this.cart.clear(
        new CartCommand(req.principal.userId, d.expectedVersion),
      ),
    );
  }
}
