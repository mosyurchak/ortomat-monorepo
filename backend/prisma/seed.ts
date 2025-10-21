import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ortomat.ua' },
    update: {},
    create: {
      email: 'admin@ortomat.ua',
      password: hashedPassword,
      role: 'ADMIN',
      firstName: 'Адмін',
      lastName: 'Системи',
      phone: '+380501234567',
      isVerified: true,
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@ortomat.ua' },
    update: {},
    create: {
      email: 'doctor@ortomat.ua',
      password: hashedPassword,
      role: 'DOCTOR',
      firstName: 'Олена',
      lastName: 'Іванова',
      middleName: 'Петрівна',
      phone: '+380502345678',
      isVerified: true,
    },
  });

  const courier = await prisma.user.upsert({
    where: { email: 'courier@ortomat.ua' },
    update: {},
    create: {
      email: 'courier@ortomat.ua',
      password: hashedPassword,
      role: 'COURIER',
      firstName: 'Михайло',
      lastName: 'Петренко',
      phone: '+380503456789',
      isVerified: true,
    },
  });

  console.log('✅ Users created');

  const ortomat1 = await prisma.ortomat.upsert({
    where: { id: 'ortomat-1' },
    update: {},
    create: {
      id: 'ortomat-1',
      name: 'Ортомат №1',
      address: 'вул. Хрещатик, 1',
      city: 'Київ',
      totalCells: 37,
      status: 'active',
    },
  });

  const ortomat3 = await prisma.ortomat.upsert({
    where: { id: 'ortomat-3' },
    update: {},
    create: {
      id: 'ortomat-3',
      name: 'Ортомат №3',
      address: 'вул. Соборна, 5',
      city: 'Житомир',
      totalCells: 37,
      status: 'active',
    },
  });

  console.log('✅ Ortomats created');

  await prisma.doctorOrtomat.upsert({
    where: {
      doctorId_ortomatId: {
        doctorId: doctor.id,
        ortomatId: ortomat1.id,
      },
    },
    update: {},
    create: {
      doctorId: doctor.id,
      ortomatId: ortomat1.id,
      referralCode: 'DOC001',
      commissionPercent: 10,
    },
  });

  console.log('✅ Doctor-Ortomat relation created');

  await prisma.courierOrtomat.upsert({
    where: {
      courierId_ortomatId: {
        courierId: courier.id,
        ortomatId: ortomat1.id,
      },
    },
    update: {},
    create: {
      courierId: courier.id,
      ortomatId: ortomat1.id,
      status: 'active',
    },
  });

  await prisma.courierOrtomat.upsert({
    where: {
      courierId_ortomatId: {
        courierId: courier.id,
        ortomatId: ortomat3.id,
      },
    },
    update: {},
    create: {
      courierId: courier.id,
      ortomatId: ortomat3.id,
      status: 'active',
    },
  });

  console.log('✅ Courier-Ortomat relations created');

  // Товари БЕЗ category
  const product1 = await prisma.product.upsert({
    where: { sku: 'COMP-SOCK-001' },
    update: {},
    create: {
      name: 'Компресійні панчохи',
      sku: 'COMP-SOCK-001',
      description: '<p>Якісні компресійні панчохи для підтримки венозного кровообігу</p>',
      size: 'M',
      price: 450,
      mainImage: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
      images: ['https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400'],
      imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { sku: 'PREG-BAND-001' },
    update: {},
    create: {
      name: 'Бандаж для вагітних',
      sku: 'PREG-BAND-001',
      description: '<p><strong>Підтримуючий бандаж</strong> для вагітних жінок</p>',
      size: 'Uni',
      price: 650,
      mainImage: 'https://images.unsplash.com/photo-1555696253-13c3c18d5d1d?w=400',
      images: [],
      imageUrl: 'https://images.unsplash.com/photo-1555696253-13c3c18d5d1d?w=400',
    },
  });

  const product3 = await prisma.product.upsert({
    where: { sku: 'POST-BAND-001' },
    update: {},
    create: {
      name: 'Післяопераційний бандаж',
      sku: 'POST-BAND-001',
      description: '<p>Післяопераційний бандаж для швидкого відновлення</p>',
      size: 'L',
      price: 850,
      mainImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
      images: [],
      imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
    },
  });

  const product4 = await prisma.product.upsert({
    where: { sku: 'ELAS-BAND-001' },
    update: {},
    create: {
      name: 'Еластичний бінт',
      sku: 'ELAS-BAND-001',
      description: '<p>Еластичний бінт для фіксації та підтримки</p>',
      size: 'Uni',
      price: 120,
      mainImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
      images: ['https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400'],
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
    },
  });

  const product5 = await prisma.product.upsert({
    where: { sku: 'MENS-CUP-001' },
    update: {},
    create: {
      name: 'Менструальна чаша',
      sku: 'MENS-CUP-001',
      description: '<h3>Екологічна менструальна чаша</h3><p>Багаторазове використання</p>',
      size: 'S',
      price: 350,
      mainImage: 'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400',
      images: [],
      imageUrl: 'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400',
    },
  });

  console.log('✅ Products created');

  const products = [product1, product2, product3, product4, product5];

  for (let i = 1; i <= 37; i++) {
    const productIndex = i <= 5 ? i - 1 : null;
    
    await prisma.cell.upsert({
      where: {
        ortomatId_number: {
          ortomatId: ortomat1.id,
          number: i,
        },
      },
      update: {},
      create: {
        number: i,
        ortomatId: ortomat1.id,
        productId: productIndex !== null ? products[productIndex].id : null,
        isAvailable: productIndex !== null,
      },
    });
  }

  console.log('✅ Cells created for Ortomat 1');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });