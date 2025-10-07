import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  createOrder(@Body() createOrderDto: any) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Post(':id/pay')
  processPayment(@Param('id') id: string) {
    return this.ordersService.processPayment(id);
  }

  @Post('callback')
  handleCallback(@Body() callbackData: any) {
    return this.ordersService.handlePaymentCallback(callbackData);
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Post(':id/open-cell')
  openCell(@Param('id') id: string) {
    return this.ordersService.openCell(id);
  }
}