import { DynamoDB } from "aws-sdk";
import { v4 } from "uuid";
import { HttpError } from "../errors/HttpError";
import { ValidationError } from "../errors/ValidateError";
import { todoItem } from "./todo.dto";
import { handleErrors } from "../errors/handleErrors";

const docClient = new DynamoDB.DocumentClient();
const tableName = "TodoTable";

export class TodoService {
  static async addItem(body: any) {
    try {
      const item: todoItem = this.addValuesToBody(body);
      const newItem = await docClient
        .put({
          TableName: tableName,
          Item: item,
        })
        .promise();

      if (newItem.$response.error) {
        throw new HttpError(400, { type: "HttpError", error: "Unable to add item" });
      }

      return {
        statusCode: 201,
        body: JSON.stringify(item),
        headers: { "Content-Type": "application/json" },
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof HttpError) {
        handleErrors(error.statusCode, error.message);
      }

      if (error instanceof SyntaxError) {
        handleErrors(400, error.message);
      }

      // good practise to log error here, in case that i don't use any logger, i will just use console log
      // to log error, and check than, which of error i missed when coding
      console.log(error);

      return handleErrors(500, "Something went wrong");
    }
  }

  static async getItems() {
    try {
      const output = await docClient.scan({ TableName: tableName }).promise();
      if (output.$response.error) {
        throw new HttpError(404, { type: "HttpError", error: "No items found" });
      }
      return {
        statusCode: 200,
        body: JSON.stringify(output.Items /* ?.reverse() */),
        headers: { "Content-Type": "application/json" },
      };
    } catch (error) {
      if (error instanceof HttpError) {
        handleErrors(error.statusCode, error.message);
      }

      // good practise to log error here, in case that i don't use any logger, i will just use console log
      // to log error, and check than, which of error i missed when coding
      console.log(error);

      return handleErrors(500, "Something went wrong");
    }
  }

  static validateBody(body: any) {
    for (const param in body as object) {
      if (param !== "label") {
        throw new ValidationError({ type: "Validation Error", error: "invalid body" });
      }
    }
  }

  static addValuesToBody(body: any): todoItem {
    try {
      const reqBody = JSON.parse(body);
      this.validateBody(reqBody);
      return {
        ...reqBody,
        id: v4(),
        completed: false,
        createdAt: new Date().getTime().toString(),
      };
    } catch (error) {
      throw error;
    }
  }
}
