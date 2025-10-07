import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Очищаємо БД
  await prisma.sale.deleteMany();
  await prisma.cell.deleteMany();
  await prisma.doctorOrtomat.deleteMany();
  await prisma.courierOrtomat.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ortomat.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared');

  // Хешуємо пароль
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Створюємо адміністратора
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ortomat.ua',
      password: hashedPassword,
      role: 'ADMIN',
      firstName: 'Адмін',
      lastName: 'Системи',
      phone: '+380991234567',
      isVerified: true,
    },
  });
  console.log('✅ Admin created');

  // 2. Створюємо 5 ортоматів
  const ortomats = await Promise.all([
    prisma.ortomat.create({
      data: {
        name: 'Ортомат №1',
        address: 'вул. Київська 1, Поліклініка №1',
        totalCells: 37,
        status: 'active',
      },
    }),
    prisma.ortomat.create({
      data: {
        name: 'Ортомат №2',
        address: 'вул. Перемоги 15, Травмпункт №1',
        totalCells: 37,
        status: 'active',
      },
    }),
    prisma.ortomat.create({
      data: {
        name: 'Ортомат №3',
        address: 'пр. Миру 23, Поліклініка №3',
        totalCells: 37,
        status: 'active',
      },
    }),
    prisma.ortomat.create({
      data: {
        name: 'Ортомат №4',
        address: 'вул. Соборна 45, Лікарня №2',
        totalCells: 37,
        status: 'active',
      },
    }),
    prisma.ortomat.create({
      data: {
        name: 'Ортомат №5',
        address: 'вул. Незалежності 67, Травмпункт №2',
        totalCells: 37,
        status: 'active',
      },
    }),
  ]);
  console.log('✅ 5 Ortomats created');

  // 3. Створюємо 7 видів товарів
  const products = [
    {
      name: 'Наколінник еластичний S',
      category: 'Наколінники',
      description: 'Еластичний наколінник для підтримки колінного суглоба',
      size: 'S',
      price: 450,
      imageUrl: '/images/nakolin-s.jpg',
      attributes: {
        sizes: ['S', 'M', 'L', 'XL'],
        material: 'Еластан 80%, Поліестер 20%',
        compression: 'Середня',
        support: 'Колінний суглоб',
      },
    },
    {
      name: 'Наколінник еластичний M',
      category: 'Наколінники',
      description: 'Еластичний наколінник для підтримки колінного суглоба',
      size: 'M',
      price: 450,
      imageUrl: '/images/nakolin-m.jpg',
      attributes: {
        sizes: ['S', 'M', 'L', 'XL'],
        material: 'Еластан 80%, Поліестер 20%',
        compression: 'Середня',
        support: 'Колінний суглоб',
      },
    },
    {
      name: 'Бандаж на гомілковостоп M',
      category: 'Бандажі',
      description: 'Бандаж для фіксації гомілковостопного суглоба',
      size: 'M',
      price: 520,
      imageUrl: '/images/bandazh-gomilka.jpg',
      attributes: {
        sizes: ['S', 'M', 'L'],
        material: 'Неопрен',
        support: 'Гомілковостоп',
        adjustable: true,
      },
    },
    {
      name: 'Корсет поперековий L',
      category: 'Корсети',
      description: 'Ортопедичний корсет для підтримки поперекового відділу',
      size: 'L',
      price: 890,
      imageUrl: '/images/korset-l.jpg',
      attributes: {
        sizes: ['M', 'L', 'XL'],
        material: 'Неопрен з металевими вставками',
        support: 'Поперековий відділ',
        adjustable: true,
      },
    },
    {
      name: 'Ортез на променево-зап\'ястковий суглоб',
      category: 'Ортези',
      description: 'Універсальний ортез для фіксації зап\'ястка',
      size: 'Універсальний',
      price: 620,
      imageUrl: '/images/ortez-zapyastok.jpg',
      attributes: {
        universal: true,
        material: 'Неопрен',
        support: 'Зап\'ястковий суглоб',
        adjustable: true,
      },
    },
    {
      name: 'Бандаж на плечовий суглоб лівий',
      category: 'Бандажі',
      description: 'Бандаж для підтримки лівого плечового суглоба',
      size: 'Універсальний',
      price: 780,
      imageUrl: '/images/bandazh-plecho-left.jpg',
      attributes: {
        sides: ['Лівий', 'Правий'],
        material: 'Еластан',
        support: 'Плечовий суглоб',
        adjustable: true,
      },
    },
    {
      name: 'Еластичний бинт 5м',
      category: 'Бинти',
      description: 'Медичний еластичний бинт',
      size: '5м',
      price: 180,
      imageUrl: '/images/bint-5m.jpg',
      attributes: {
        lengths: ['5м', '10м'],
        material: 'Бавовна 70%, Еластан 30%',
        reusable: true,
      },
    },
  ];

  const createdProducts = [];
  for (const product of products) {
    const p = await prisma.product.create({ data: product });
    createdProducts.push(p);
  }
  console.log('✅ 7 Products created');

  // 4. Створюємо лікарів (10 на перший ортомат)
  const doctors = [];
  for (let i = 1; i <= 10; i++) {
    const doctor = await prisma.user.create({
      data: {
        email: `doctor${i}@ortomat.ua`,
        password: hashedPassword,
        role: 'DOCTOR',
        firstName: `Лікар${i}`,
        lastName: 'Ортопед',
        phone: `+38099${String(i).padStart(7, '0')}`,
        isVerified: true,
      },
    });

    // Прив'язуємо до першого ортомату
    await prisma.doctorOrtomat.create({
      data: {
        doctorId: doctor.id,
        ortomatId: ortomats[0].id,
        referralCode: `REF-DOCTOR-${String(i).padStart(3, '0')}`,
        commissionPercent: 10.0,
      },
    });

    doctors.push(doctor);
  }
  console.log('✅ 10 Doctors created and assigned to Ortomat #1');

  // 5. Створюємо 2 кур'єри
  const courier1 = await prisma.user.create({
    data: {
      email: 'courier1@ortomat.ua',
      password: hashedPassword,
      role: 'COURIER',
      firstName: 'Кур\'єр',
      lastName: 'Перший',
      phone: '+380991111111',
      isVerified: true,
    },
  });

  const courier2 = await prisma.user.create({
    data: {
      email: 'courier2@ortomat.ua',
      password: hashedPassword,
      role: 'COURIER',
      firstName: 'Кур\'єр',
      lastName: 'Другий',
      phone: '+380992222222',
      isVerified: true,
    },
  });

  // Призначаємо ортомати кур'єрам
  await prisma.courierOrtomat.createMany({
    data: [
      { courierId: courier1.id, ortomatId: ortomats[0].id },
      { courierId: courier1.id, ortomatId: ortomats[1].id },
      { courierId: courier2.id, ortomatId: ortomats[2].id },
      { courierId: courier2.id, ortomatId: ortomats[3].id },
      { courierId: courier2.id, ortomatId: ortomats[4].id },
    ],
  });
  console.log('✅ 2 Couriers created and assigned');

  // 6. Заповнюємо комірки товарами (по 7 товарів в кожен ортомат)
  for (const ortomat of ortomats) {
    for (let i = 0; i < 7; i++) {
      await prisma.cell.create({
        data: {
          number: i + 1,
          ortomatId: ortomat.id,
          productId: createdProducts[i].id,
          isAvailable: true,
        },
      });
    }
  }
  console.log('✅ Cells filled with products');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📧 Login credentials:');
  console.log('Admin: admin@ortomat.ua / password123');
  console.log('Doctor: doctor1@ortomat.ua / password123');
  console.log('Courier: courier1@ortomat.ua / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });