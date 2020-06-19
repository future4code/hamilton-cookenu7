import { BaseDatabase } from "./BaseDatabase";

export class Followers extends BaseDatabase {
  private static TABLE_NAME = "Followers";

  public async createFollower(
    idUser: string,
    userToFollowId: string
  ): Promise<void> {
    try {
      await this.getConnection()
        .insert({
          user_id: idUser,
          toFollow_id: userToFollowId,
        })
        .into(Followers.TABLE_NAME);
    } catch (err) {
      console.error(err.message);
    }
  }

  
  public async unfollow(
    idUser: string,
    userToUnfollowId: string
  ): Promise<void> {
    try {
      await this.getConnection()
        .delete()
        .from(Followers.TABLE_NAME)
        .where({ toFollow_id: userToUnfollowId })
        .andWhere({ user_id: idUser });
    } catch (err) {
      console.error(err.message);
    }
  }

  public async getFollowers(idUser: string): Promise<any> {
    try {
      const resultDataBase = await this.getConnection()
        .select("toFollow_id")
        .from(Followers.TABLE_NAME)
        .where({ user_id: idUser });

      return resultDataBase; 
    } catch (err) {
      console.error(err.message);
    }
  }
}
