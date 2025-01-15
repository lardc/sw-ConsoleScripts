function test_script()
{
	var ResultArray= [];
	var FirstTestNumber = 1;
	var LastTestNumber = 100;
	
	//поиск элементов
	for (var i = FirstTestNumber; i <= LastTestNumber; i++)
	{
		if((i%3 == 0)||(i%5==0))
		{
			ResultArray.push(i);
		}
	}

	var StringOutput= ResultArray.toString();

	p(StringOutput);
	pl(ResultArray);
	save('Test_script_result.txt', StringOutput);
}