import { Injectable, ConflictException, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UserType } from '@prisma/client';

type SignupParams = {
  email: string;
  password: string;
  name: string;
  phone: string;
};

type SigninParams = {
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Tokenを作成し返却する
   * @date 2022-03-15
   * @param {string} name
   * @param {number} id
   * @returns {string} JSON_WEB_TOKEN
   */
  private generateJWT(name: string, id: number) {
    return jwt.sign(
      {
        name,
        id,
      },
      process.env.JSON_TOKEN_KEY,
      {
        expiresIn: 3600000,
      },
    );
  }

  /**
   * userType と SignupParams を受け取りユーザーを作成します
   * @date 2022-03-17
   * @param {SignupParams} SignupParams
   * @param {UserType} userType
   * @returns {string} JSON_WEB_TOKEN
   */
  async signup(
    { email, password, name, phone }: SignupParams,
    userType: UserType,
  ) {
    const userExists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (userExists) throw new ConflictException();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.user.create({
      data: {
        email,
        name,
        phone,
        password: hashedPassword,
        user_type: userType,
      },
    });

    return this.generateJWT(name, user.id);
  }

  /**
   * SigninParams を受け取りユーザーにログインします
   * @date 2022-03-17
   * @param {SigninParams} SigninParams
   * @returns {string} JSON_WEB_TOKEN
   */
  async signin({ email, password }: SigninParams) {
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user)
      throw new HttpException(
        'メールアドレスまたはパスワードが一致しません。',
        400,
      );

    const hashedPassword = user.password;
    // 一致する場合はtrueを返却
    const isValidPassword = await bcrypt.compare(password, hashedPassword);

    if (!isValidPassword)
      throw new HttpException(
        'メールアドレスまたはパスワードが一致しません。',
        400,
      );

    return this.generateJWT(user.name, user.id);
  }

  /**
   * realtor と admin アカウントを作成するのに必要なプロダクトキーを生成します
   * @date 2022-03-17
   * @param {string} email
   * @param {UserType} userType
   * @returns {string} productKey
   */
  generateProductKey(email: string, userType: UserType) {
    const string = `${email}-${userType}-${process.env.PRODUCT_KEY_SECRET}`;
    return bcrypt.hash(string, 10);
  }
}
